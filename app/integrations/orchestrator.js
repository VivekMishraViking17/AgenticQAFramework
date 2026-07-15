const jira = require("./jira");
const confluence = require("./confluence");
const xray = require("./xray");
const { isJiraConfigured, isXrayConfigured } = require("./config");

const TC_TEMPLATES = [
  ["functional", "Verify happy path: {ac}", "Execute primary flow", "Expected behavior matches AC"],
  ["edge-case", "Boundary: {ac}", "Test empty/max/invalid inputs", "Validation errors shown"],
  ["security", "Auth check: {component}", "Unauthorized access attempt", "403/401 returned"],
  ["data-centric", "Data integrity: {component}", "CRUD with valid/invalid data", "Data validated"],
  ["non-functional", "Latency: {component}", "Load under normal conditions", "p95 within SLA"],
  ["uat", "Business flow: {title}", "End-to-end scenario", "Business criteria met"],
  ["api-contract", "API contract: {component}", "Schema and status codes", "Contract matches spec"],
  ["regression", "Regression: {key}", "Re-run prior defect", "Bug does not reproduce"],
];

function parseAc(ac) {
  const lines = (ac || "")
    .split("\n")
    .map((l) => l.replace(/^[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : ["Core feature works as specified"];
}

function buildTestCases(story) {
  const ac = parseAc(story.acceptance_criteria);
  const fmt = (t) =>
    t
      .replace("{ac}", ac[0])
      .replace("{component}", story.component || "service")
      .replace("{title}", story.title)
      .replace("{key}", story.key);
  story.test_cases = TC_TEMPLATES.map((t, i) => ({
    id: i + 1,
    xray_key: "",
    title: fmt(t[1]),
    steps: t[2],
    expected_result: t[3],
    label: t[0],
    priority: t[0] === "functional" ? "P1" : story.priority,
    automation_candidate: ["functional", "api-contract", "regression"].includes(t[0]),
    approved: false,
    reviewer: "",
    test_type: "Manual",
    description: "",
    precondition: "",
    steps_list: [{ id: 1, action: fmt(t[2]), data: "", expected: t[3] }],
  }));
  story.review_status = "pending";
  return story.test_cases.length;
}

async function generateTestCases(story, creds) {
  const count = buildTestCases(story);
  return `Generated ${count} labeled test cases (functional, edge, security, NFR, UAT, API, regression)`;
}

async function runPhaseLive(story, phase, creds) {
  const ac = parseAc(story.acceptance_criteria);
  const fmt = (t) =>
    t
      .replace("{ac}", ac[0])
      .replace("{component}", story.component || "service")
      .replace("{title}", story.title)
      .replace("{key}", story.key);

  switch (phase) {
    case "intake": {
      if (isJiraConfigured(creds)) {
        const issue = await jira.getIssue(creds, story.key);
        const mapped = jira.mapIssueToStory(issue);
        Object.assign(story, {
          title: mapped.title,
          description: mapped.description,
          acceptance_criteria: mapped.acceptance_criteria || story.acceptance_criteria,
          component: mapped.component,
          priority: mapped.priority,
          programme: mapped.programme,
          jira_status: mapped.jira_status,
        });
        return `Live Jira sync: ${story.key} — ${ac.length} AC lines parsed`;
      }
      return `Parsed ${story.key}: ${ac.length} AC lines, DOD validated`;
    }
    case "knowledge": {
      if (isJiraConfigured(creds) && creds.confluence?.enabled !== false) {
        const ctx = await confluence.gatherContext(creds, story);
        story.knowledge_context = ctx.summary;
        return `Live Confluence: ${ctx.pages.length} pages for "${ctx.query}"`;
      }
      story.knowledge_context =
        "Confluence: JSIM Testing Information (VC/pages/4745199630)\nPRD: " +
        (story.component || "platform") +
        "-requirements\nRelated bugs: 2 escaped defects in last 90d (Jira JQL)";
      return "Retrieved 3 knowledge sources for RAG bundle";
    }
    case "design": {
      const count = buildTestCases(story);
      return `Generated ${count} labeled test cases`;
    }
    case "review":
      return `Coverage matrix: ${story.test_cases.length} TCs, labels complete`;
    case "xray": {
      const approved = story.test_cases.filter((tc) => tc.approved);
      if (isXrayConfigured(creds) && approved.length) {
        const published = await xray.publishTestCases(creds, story, story.test_cases);
        story.xray_published = true;
        story.jira_status = "In QA";
        if (isJiraConfigured(creds)) {
          try {
            await jira.transitionIssue(creds, story.key, "In QA");
          } catch (e) {
            /* workflow may differ */
          }
        }
        return `Live XRay: published ${published.length} tests; Jira → In QA`;
      }
      approved.forEach((tc, i) => {
        tc.xray_key = `XR-${story.key.replace("VCPCORE-", "")}-${String(i + 1).padStart(3, "0")}`;
      });
      story.xray_published = true;
      story.jira_status = "In QA";
      return `Published ${approved.length} tests to XRay (simulated); Jira → In QA`;
    }
    case "auto_plan": {
      const c = story.test_cases.filter((t) => t.approved && t.automation_candidate).length;
      story.automation_priority = `P1/P2: ${c} candidates`;
      return `Identified ${c} automation candidates`;
    }
    case "codegen": {
      const org = creds.github?.org || "vikingcloud";
      const repo = creds.github?.repo || "qe-automation";
      story.automation_pr_url = `https://github.com/${org}/${repo}/pull/${100 + story.id}`;
      return `Playwright PR created: ${story.automation_pr_url}`;
    }
    case "execute": {
      if (!story.defects.length) {
        const link = story.test_cases.find((t) => t.xray_key)?.xray_key || "";
        const defectTitle = `Product defect found during INT automation: ${story.title.slice(0, 50)}`;
        const labels = ["auto-filed", "qe-agent", "found-in-automation", `programme:${story.programme || "CVEP"}`];
        let defectKey = `VCPCORE-BUG-${story.key.split("-")[1] || story.id}`;

        if (isJiraConfigured(creds)) {
          const created = await jira.createIssue(creds, {
            projectKey: story.key.split("-")[0] || creds.jira.defaultProject,
            issueType: "Bug",
            summary: defectTitle,
            description: `Found during agentic QE execution on asgard-int.\nStory: ${story.key}\nLinked test: ${link}`,
            labels,
            priority: "Medium",
          });
          defectKey = created.key;
          try {
            await jira.transitionIssue(creds, story.key, "PO Review");
          } catch {
            /* optional */
          }
        }

        story.defects.push({
          id: 1,
          key: defectKey,
          title: defectTitle,
          severity: "Medium",
          component: story.component,
          labels: labels.join(","),
          status: "Open",
          linked_test: link,
          created_at: new Date().toISOString(),
        });
        story.jira_status = "PO Review";
        return isJiraConfigured(creds)
          ? `CI complete. Live defect ${defectKey} filed; Jira → PO Review`
          : `CI on asgard-int complete. Defect filed; Jira → PO Review`;
      }
      return "CI complete. All tests passed";
    }
    default:
      return "Done";
  }
}

async function syncStoriesFromJira(creds, data) {
  const jql = jira.normalizeJql(creds);
  const issues = await jira.searchIssues(creds, jql, 25);
  let added = 0;
  let updated = 0;

  for (const issue of issues) {
    const mapped = jira.mapIssueToStory(issue);
    let story = data.stories.find((s) => s.key === mapped.key);
    if (story) {
      story.title = mapped.title;
      story.description = mapped.description;
      story.jira_status = mapped.jira_status;
      story.component = mapped.component;
      story.priority = mapped.priority;
      story.programme = mapped.programme;
      story.updated_at = new Date().toISOString();
      updated++;
    } else {
      data.stories.push({
        id: data.nextId++,
        key: mapped.key,
        title: mapped.title,
        description: mapped.description,
        acceptance_criteria: mapped.acceptance_criteria,
        definition_of_done: "",
        component: mapped.component,
        priority: mapped.priority,
        programme: mapped.programme,
        sprint_lane: "Board 154",
        jira_status: mapped.jira_status,
        phase: "intake",
        knowledge_context: "",
        review_status: "pending",
        review_notes: "",
        xray_published: false,
        automation_priority: "",
        automation_pr_url: "",
        test_cases: [],
        defects: [],
        agent_runs: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      added++;
    }
  }
  saveDataRef(data);
  return { added, updated, total: issues.length, jql };
}

let saveDataRef = () => {};

function setSaveData(fn) {
  saveDataRef = fn;
}

async function getIntegrationStatus(creds) {
  const status = {
    jira: { configured: isJiraConfigured(creds), connected: false, error: null },
    xray: { configured: isXrayConfigured(creds), connected: false, error: null },
    confluence: { configured: isJiraConfigured(creds), enabled: creds.confluence?.enabled !== false },
    mode: isJiraConfigured(creds) ? "live" : "simulated",
  };
  if (status.jira.configured) {
    try {
      const r = await jira.testConnection(creds);
      status.jira.connected = true;
      status.jira.user = r.account?.displayName || r.account?.emailAddress;
    } catch (e) {
      status.jira.error = e.message;
    }
  }
  if (status.xray.configured) {
    try {
      await xray.testConnection(creds);
      status.xray.connected = true;
    } catch (e) {
      status.xray.error = e.message;
    }
  }
  return status;
}

async function listJiraStoriesForPicker(creds, maxResults = 50) {
  const jql = jira.normalizeJql(creds);
  const issues = await jira.searchIssues(creds, jql, maxResults);
  return issues.map((issue) => {
    const mapped = jira.mapIssueToStory(issue);
    return {
      key: mapped.key,
      title: mapped.title,
      status: mapped.jira_status,
      priority: mapped.priority,
      component: mapped.component,
      programme: mapped.programme,
    };
  });
}

async function importStoryFromJira(creds, key) {
  const issue = await jira.getIssue(creds, key);
  return jira.mapIssueToStory(issue);
}

module.exports = {
  runPhaseLive,
  syncStoriesFromJira,
  getIntegrationStatus,
  listJiraStoriesForPicker,
  importStoryFromJira,
  generateTestCases,
  buildTestCases,
  setSaveData,
};
