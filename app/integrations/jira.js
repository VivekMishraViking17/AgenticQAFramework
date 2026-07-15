const { request, jiraAuthHeader, adfParagraph, extractAdfText } = require("./http");

function jiraBase(creds) {
  return creds.jira.baseUrl.replace(/\/$/, "");
}

function headers(creds) {
  return {
    ...jiraAuthHeader(creds.jira.email, creds.jira.apiToken),
    "Content-Type": "application/json",
  };
}

async function testConnection(creds) {
  const base = jiraBase(creds);
  const res = await request(`${base}/rest/api/3/myself`, { headers: headers(creds) });
  return { ok: true, account: res.data };
}

const DEFAULT_READY_FOR_QA_JQL =
  'project = VCPCORE AND status = "Ready for QA" ORDER BY updated DESC';

function normalizeJql(creds) {
  const jql = (creds.jira?.readyForQaJql || "").trim();
  if (!jql || jql.length < 20 || /=\s*$/.test(jql) || !jql.includes("status")) {
    return DEFAULT_READY_FOR_QA_JQL;
  }
  return jql;
}

async function searchIssues(creds, jql, maxResults = 50) {
  const base = jiraBase(creds);
  const query = jql || normalizeJql(creds);
  const res = await request(
    `${base}/rest/api/3/search/jql`,
    { method: "POST", headers: headers(creds) },
    {
      jql: query,
      maxResults,
      fields: ["summary", "description", "status", "priority", "components", "labels"],
    }
  );
  return res.data.issues || [];
}

async function getIssue(creds, key) {
  const base = jiraBase(creds);
  const res = await request(
    `${base}/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status,priority,components,labels,issuetype`,
    { headers: headers(creds) }
  );
  return res.data;
}

async function createIssue(creds, { projectKey, issueType, summary, description, labels, priority }) {
  const base = jiraBase(creds);
  const fields = {
    project: { key: projectKey },
    issuetype: { name: issueType },
    summary,
    description: adfParagraph(description),
  };
  if (labels?.length) fields.labels = labels;
  if (priority) fields.priority = { name: priority };
  const res = await request(`${base}/rest/api/3/issue`, { method: "POST", headers: headers(creds) }, { fields });
  return res.data;
}

async function getTransitions(creds, key) {
  const base = jiraBase(creds);
  const res = await request(`${base}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, {
    headers: headers(creds),
  });
  return res.data.transitions || [];
}

async function transitionIssue(creds, key, transitionName) {
  const transitions = await getTransitions(creds, key);
  const t = transitions.find((x) => x.name.toLowerCase() === transitionName.toLowerCase());
  if (!t) throw new Error(`Transition "${transitionName}" not found for ${key}`);
  const base = jiraBase(creds);
  await request(
    `${base}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`,
    { method: "POST", headers: headers(creds) },
    { transition: { id: t.id } }
  );
  return { transition: t.name };
}

function mapIssueToStory(issue) {
  const f = issue.fields || {};
  const desc = f.description ? extractAdfText(f.description) : "";
  const components = (f.components || []).map((c) => c.name).join(", ");
  const priority = f.priority?.name || "P3";
  return {
    key: issue.key,
    title: f.summary || issue.key,
    description: desc,
    acceptance_criteria: desc,
    definition_of_done: "",
    component: components || "VCPCORE",
    priority: mapVikingPriority(priority),
    programme: inferProgramme(f.labels),
    jira_status: f.status?.name || "Unknown",
    jira_id: issue.id,
  };
}

function mapVikingPriority(p) {
  const u = (p || "").toUpperCase();
  if (u.includes("P1") || u.includes("HIGHEST") || u.includes("BLOCKER")) return "P1 — Deal Breaker";
  if (u.includes("P2") || u.includes("HIGH") || u.includes("CRITICAL")) return "P2 — Critical";
  if (u.includes("P4") || u.includes("LOW") || u.includes("MINOR")) return "P4 — Nice to Have";
  return "P3 — Highly Desirable";
}

function inferProgramme(labels) {
  const ls = (labels || []).map((l) => l.toUpperCase());
  if (ls.some((l) => l.includes("CVEP"))) return "CVEP";
  if (ls.some((l) => l.includes("JSIM"))) return "JSIM";
  return "CVEP";
}

module.exports = {
  testConnection,
  searchIssues,
  getIssue,
  createIssue,
  transitionIssue,
  mapIssueToStory,
  jiraBase,
  normalizeJql,
  DEFAULT_READY_FOR_QA_JQL,
};
