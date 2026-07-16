/**
 * Agentic QE Platform — zero-dependency Node.js server
 * Run: node server.js
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const {
  loadCredentials,
  saveCredentials,
  maskCredentials,
  isJiraConfigured,
  isXrayConfigured,
} = require("./integrations/config");
const orchestrator = require("./integrations/orchestrator");
const metrics = require("./integrations/metrics");
const cxoBriefing = require("./integrations/cxo-briefing");
const defectsCatalog = require("./integrations/defects-catalog");
const defectAnalysis = require("./integrations/defect-analysis");
const auth = require("./auth/auth");

auth.loadDotEnv();

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");
const QA_RESOURCES_FILE = path.join(ROOT, "config", "qa-resources.json");

const PHASES = ["intake","knowledge","design","review","xray","auto_plan","codegen","execute","done"];
const JIRA_STATUS_BY_PHASE = {
  intake: "Ready for QA", knowledge: "Ready for QA", design: "Ready for QA", review: "Ready for QA",
  xray: "In QA", auto_plan: "In QA", codegen: "In QA", execute: "In QA", done: "Closed",
};
const PHASE_AGENTS = {
  intake: "Story Context Agent", knowledge: "Knowledge Agent", design: "Test Design Agent",
  review: "Review Orchestrator", xray: "XRay Sync Agent", auto_plan: "Automation Scout",
  codegen: "Codegen Agent", execute: "Execution + Triage Agent",
};
const TC_TEMPLATES = [
  ["functional","Verify happy path: {ac}","Execute primary flow","Expected behavior matches AC"],
  ["edge-case","Boundary: {ac}","Test empty/max/invalid inputs","Validation errors shown"],
  ["security","Auth check: {component}","Unauthorized access attempt","403/401 returned"],
  ["data-centric","Data integrity: {component}","CRUD with valid/invalid data","Data validated"],
  ["non-functional","Latency: {component}","Load under normal conditions","p95 within SLA"],
  ["uat","Business flow: {title}","End-to-end scenario","Business criteria met"],
  ["api-contract","API contract: {component}","Schema and status codes","Contract matches spec"],
  ["regression","Regression: {key}","Re-run prior defect","Bug does not reproduce"],
];

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    metrics.ensureMetrics(data);
    return data;
  }
  const data = { stories: [], nextId: 1, nextKey: 1001, metrics: { tokenBudgetMonthly: metrics.DEFAULT_TOKEN_BUDGET, tokenPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() } };
  saveData(data);
  return data;
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
orchestrator.setSaveData(saveData);

function seedIfEmpty(data) {
  if (data.stories.length) return;
  data.stories.push({
    id: data.nextId++, key: `VCPCORE-${data.nextKey++}`,
    title: "Merchant onboarding theme configuration API",
    description: "As a merchant admin I want to configure portal theme so branding matches my store.",
    acceptance_criteria: "- POST /merchanttheme returns 200 with valid payload\n- Invalid theme ID returns 400\n- Unauthorized user receives 403\n- Theme persists after page reload",
    definition_of_done: "- Unit tests pass\n- Deployed to INT (asgard-int)\n- API documented in Confluence\n- QA sign-off",
    component: "vcp-subscription-service", priority: "P1 — Deal Breaker",
    programme: "CVEP", sprint_lane: "VCP Marketplace payments",
    jira_status: "Ready for QA", phase: "intake",
    knowledge_context: "", review_status: "pending", review_notes: "",
    xray_published: false, automation_priority: "", automation_pr_url: "",
    test_cases: [], defects: [], agent_runs: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  data.stories.push({
    id: data.nextId++, key: `VCPCORE-${data.nextKey++}`,
    title: "Dashboard drawer close on Escape key",
    description: "Identity protection drawer should close on Escape or overlay click.",
    acceptance_criteria: "- Escape key closes drawer\n- Click outside closes drawer\n- Focus returns to trigger",
    definition_of_done: "- Accessibility review done\n- E2E in CI",
    component: "VCPCORE", priority: "P2 — Critical",
    programme: "JSIM", sprint_lane: "JSIM Standalone",
    jira_status: "Ready for QA", phase: "intake",
    knowledge_context: "", review_status: "pending", review_notes: "",
    xray_published: false, automation_priority: "", automation_pr_url: "",
    test_cases: [], defects: [], agent_runs: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  saveData(data);
}

function parseAc(ac) {
  const lines = (ac || "").split("\n").map(l => l.replace(/^[-*•\d.)]+\s*/, "").trim()).filter(Boolean);
  return lines.length ? lines : ["Core feature works as specified"];
}

function logAgent(story, phase, summary) {
  const tokenInfo = metrics.buildAgentRunTokens(phase, story);
  story.agent_runs.push({
    id: story.agent_runs.length + 1, agent_name: PHASE_AGENTS[phase] || "Agent",
    phase, output_summary: summary, duration_ms: 800 + Math.floor(Math.random() * 3000),
    created_at: new Date().toISOString(),
    ...tokenInfo,
  });
}

function runPhase(story, phase) {
  const ac = parseAc(story.acceptance_criteria);
  const fmt = (t) => t.replace("{ac}", ac[0]).replace("{component}", story.component || "service")
    .replace("{title}", story.title).replace("{key}", story.key);
  switch (phase) {
    case "intake":
      return `Parsed ${story.key}: ${ac.length} AC lines, DOD validated`;
    case "knowledge":
      story.knowledge_context = "Confluence: JSIM Testing Information (VC/pages/4745199630)\nPRD: " + (story.component || "platform") + "-requirements\nRelated bugs: 2 escaped defects in last 90d (Jira JQL)";
      return "Retrieved 3 knowledge sources for RAG bundle";
    case "design":
      story.test_cases = TC_TEMPLATES.map((t, i) => ({
        id: i + 1, xray_key: "", title: fmt(t[1]), steps: t[2], expected_result: t[3],
        label: t[0], priority: t[0] === "functional" ? "P1" : story.priority,
        automation_candidate: ["functional","api-contract","regression"].includes(t[0]),
        approved: false,
        reviewer: "",
        test_type: "Manual",
        description: "",
        precondition: "",
        steps_list: [{ id: i + 1, action: t[2], data: "", expected: t[3] }],
      }));
      story.review_status = "pending";
      return `Generated ${story.test_cases.length} labeled test cases`;
    case "review":
      return `Coverage matrix: ${story.test_cases.length} TCs, labels complete`;
    case "xray":
      story.test_cases.filter(tc => tc.approved).forEach((tc, i) => { tc.xray_key = `XR-${story.key.replace("VCPCORE-","")}-${String(i+1).padStart(3,"0")}`; });
      story.xray_published = true;
      story.jira_status = "In QA";
      return `Published ${story.test_cases.filter(t=>t.approved).length} tests to XRay; Jira → In QA`;
    case "auto_plan":
      const c = story.test_cases.filter(t => t.approved && t.automation_candidate).length;
      story.automation_priority = `P1/P2: ${c} candidates`;
      return `Identified ${c} automation candidates`;
    case "codegen":
      story.automation_pr_url = `https://github.com/vikingcloud/qe-auto/pull/${100 + story.id}`;
      return `Playwright PR created: ${story.automation_pr_url}`;
    case "execute":
      if (!story.defects.length) {
        const link = story.test_cases.find(t => t.xray_key)?.xray_key || "";
        story.defects.push({
          id: 1, key: `VCPCORE-BUG-${story.key.split("-")[1] || story.id}`,
          title: `Product defect found during INT automation: ${story.title.slice(0,50)}`,
          severity: "Medium", component: story.component, labels: "auto-filed,qe-agent,found-in-automation,programme:" + (story.programme || "CVEP"),
          status: "Open", linked_test: link, created_at: new Date().toISOString(),
        });
        story.jira_status = "PO Review";
        return `CI on asgard-int complete. Defect filed; Jira → PO Review`;
      }
      return "CI complete. All tests passed";
    default: return "Done";
  }
}

async function advanceStory(data, id) {
  const story = data.stories.find(s => s.id === id);
  if (!story) return { error: "Not found", status: 404 };
  if (story.phase === "done") return { error: "Already completed", status: 400 };
  if (story.phase === "review" && story.review_status !== "approved")
    return { error: "QA SME approval required", status: 400 };
  const usage = metrics.aggregateUsage(data);
  if (usage.tokens_exhausted) {
    return { error: "Monthly token budget exhausted — increase limit or wait for next period", status: 429 };
  }
  const idx = PHASES.indexOf(story.phase);
  const creds = loadCredentials();
  let summary;
  try {
    summary = isJiraConfigured(creds)
      ? await orchestrator.runPhaseLive(story, story.phase, creds)
      : runPhase(story, story.phase);
  } catch (e) {
    return { error: `Integration failed: ${e.message}`, status: 502 };
  }
  logAgent(story, story.phase, summary);
  if (idx < PHASES.length - 1) {
    story.phase = PHASES[idx + 1];
    story.jira_status = JIRA_STATUS_BY_PHASE[story.phase] || story.jira_status;
    if (story.phase === "execute" && story.defects.length) story.jira_status = "PO Review";
    if (story.phase === "done") story.jira_status = "Closed";
  }
  story.updated_at = new Date().toISOString();
  saveData(data);
  return { body: story };
}

async function generateTestCasesForStory(data, id) {
  const story = data.stories.find((s) => s.id === id);
  if (!story) return { error: "Not found", status: 404 };
  if (story.phase === "done") return { error: "Story is completed", status: 400 };
  const usage = metrics.aggregateUsage(data);
  if (usage.tokens_exhausted) {
    return { error: "Monthly token budget exhausted — increase limit or wait for next period", status: 429 };
  }
  const creds = loadCredentials();
  let summary;
  try {
    summary = isJiraConfigured(creds)
      ? await orchestrator.generateTestCases(story, creds)
      : (() => {
          runPhase(story, "design");
          return `Generated ${story.test_cases.length} labeled test cases`;
        })();
  } catch (e) {
    return { error: `Test generation failed: ${e.message}`, status: 502 };
  }
  const designIdx = PHASES.indexOf("design");
  const currentIdx = PHASES.indexOf(story.phase);
  if (currentIdx >= 0 && currentIdx < designIdx) story.phase = "design";
  logAgent(story, "design", summary);
  story.updated_at = new Date().toISOString();
  saveData(data);
  return { body: story };
}

function reviewStory(data, id, approved, notes) {
  const story = data.stories.find(s => s.id === id);
  if (!story) return { error: "Not found", status: 404 };
  if (story.phase !== "review") return { error: "Not in review", status: 400 };
  story.review_status = approved ? "approved" : "rejected";
  story.review_notes = notes;
  if (approved) {
    story.test_cases.forEach(tc => { tc.approved = true; });
    logAgent(story, "review", `QA SME approved ${story.test_cases.length} test cases`);
  } else {
    story.phase = "design";
    logAgent(story, "review", `Rejected: ${notes}`);
  }
  story.updated_at = new Date().toISOString();
  saveData(data);
  return { body: story };
}

function getStats(data) {
  metrics.ensureMetrics(data);
  const by_phase = {};
  data.stories.forEach(s => { by_phase[s.phase] = (by_phase[s.phase] || 0) + 1; });
  let total_tc = 0, approved = 0, auto = 0;
  data.stories.forEach(s => {
    total_tc += s.test_cases.length;
    approved += s.test_cases.filter(t => t.approved).length;
    auto += s.test_cases.filter(t => t.automation_candidate).length;
  });
  const defectStats = defectsCatalog.defectCounts(data.stories);
  const open_defects = defectStats.open_defects;
  const xray = data.stories.filter(s => s.xray_published).length;
  const pending = data.stories.filter(s => s.phase === "review" && s.review_status === "pending").length;
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const runs = data.stories.reduce((n, s) =>
    n + s.agent_runs.filter(r => new Date(r.created_at).getTime() >= since).length, 0);
  const usage = metrics.aggregateUsage(data);
  const analysis = defectAnalysis.buildAnalysis(data.stories);
  return {
    total_stories: data.stories.length, by_phase, total_test_cases: total_tc,
    approved_test_cases: approved, pending_reviews: pending, xray_published: xray,
    automation_candidates: auto, open_defects, agent_runs_today: runs,
    roi_multiple: usage.roi_multiple,
    labor_savings_usd: usage.labor_savings_usd,
    ai_cost_usd: usage.ai_cost_usd,
    platform_cost_usd: usage.platform_cost_usd,
    total_cost_usd: usage.total_cost_usd,
    tokens_used: usage.tokens_used,
    tokens_limit: usage.tokens_limit,
    tokens_remaining: usage.tokens_remaining,
    tokens_pct: usage.tokens_pct,
    tokens_exhausted: usage.tokens_exhausted,
    tokens_input: usage.tokens_input,
    tokens_output: usage.tokens_output,
    token_period_start: usage.token_period_start,
    tc_time_saved_pct: total_tc ? Math.min(95, Math.round((approved / Math.max(total_tc, 1)) * 75)) : 0,
    traceability_pct: data.stories.length ? Math.round(xray / data.stories.length * 100) : 0,
    cxo_pass_rate: cxoBriefing.getBriefing().kpis.find((k) => k.id === "pass-rate")?.value || "—",
    cxo_release_status: cxoBriefing.getReleaseStatus().statusLabel,
    total_defects: defectStats.total_defects,
    p2_for_po: defectStats.p2_for_po,
    escape_rate_pct: analysis.summary.escape_rate_pct,
    analysis_trace_pct: analysis.summary.traceability_pct,
  };
}

function loadQaResourcesFile() {
  if (fs.existsSync(QA_RESOURCES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(QA_RESOURCES_FILE, "utf8"));
    } catch {
      return [];
    }
  }
  return [];
}

async function loadQaResources() {
  const creds = loadCredentials();
  if (isJiraConfigured(creds)) {
    try {
      const qaTeam = require("./integrations/qa-team");
      const group = creds.qa?.jiraGroup || qaTeam.DEFAULT_QA_GROUP;
      const live = await qaTeam.fetchQaTeamMembers(creds, group);
      if (live.length) return live;
    } catch {
      /* fall back to file */
    }
  }
  return loadQaResourcesFile();
}

function updateTestCase(data, storyId, tcId, patch) {
  const story = data.stories.find((s) => s.id === storyId);
  if (!story) return { error: "Story not found", status: 404 };
  const tc = story.test_cases.find((t) => t.id === tcId);
  if (!tc) return { error: "Test case not found", status: 404 };
  const allowed = [
    "title", "steps", "expected_result", "label", "priority",
    "approved", "automation_candidate", "reviewer", "xray_key",
    "test_type", "description", "precondition", "steps_list",
  ];
  for (const key of allowed) {
    if (patch[key] !== undefined) tc[key] = patch[key];
  }
  if (patch.steps_list && Array.isArray(patch.steps_list)) {
    tc.steps = patch.steps_list.map((s) => s.action).filter(Boolean).join("\n");
    const last = patch.steps_list[patch.steps_list.length - 1];
    if (last?.expected) tc.expected_result = last.expected;
  }
  story.updated_at = new Date().toISOString();
  saveData(data);
  return { body: { ...tc, story_id: story.id, story_key: story.key } };
}

async function uploadTestCaseToXray(data, storyId, tcId) {
  const story = data.stories.find((s) => s.id === storyId);
  if (!story) return { error: "Story not found", status: 404 };
  const tc = story.test_cases.find((t) => t.id === tcId);
  if (!tc) return { error: "Test case not found", status: 404 };
  if (!tc.reviewer) {
    return { error: "Assign a QA reviewer before uploading to XRay", status: 400 };
  }
  if (tc.xray_key) {
    return { body: { ...tc, story_id: story.id, story_key: story.key, _already: true } };
  }
  const creds = loadCredentials();
  try {
    if (isXrayConfigured(creds)) {
      const xray = require("./integrations/xray");
      const created = await xray.publishSingleTestCase(creds, story, tc);
      tc.xray_key = created.key;
    } else {
      tc.xray_key = `XR-${story.key.replace("VCPCORE-", "")}-${String(tc.id).padStart(3, "0")}`;
    }
    tc.approved = true;
    if (story.test_cases.every((t) => t.xray_key)) story.xray_published = true;
    if (story.test_cases.some((t) => t.xray_key)) story.jira_status = "In QA";
    logAgent(story, "xray", `Uploaded to XRay: ${tc.xray_key} (reviewer: ${tc.reviewer})`);
    story.updated_at = new Date().toISOString();
    saveData(data);
    return { body: { ...tc, story_id: story.id, story_key: story.key } };
  } catch (e) {
    return { error: `XRay upload failed: ${e.message}`, status: 502 };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", c => buf += c);
    req.on("end", () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".json": "application/json", ".ico": "image/x-icon" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const data = loadData();
  seedIfEmpty(data);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const authResult = await auth.authMiddleware(req, res, url);
  if (authResult.handled) return;
  if (!authResult.ok) return;

  try {
    if (url.pathname === "/api/stories" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(data.stories.sort((a,b) => b.updated_at.localeCompare(a.updated_at))));
    }
    if (url.pathname === "/api/stories" && req.method === "POST") {
      const body = await readBody(req);
      const creds = loadCredentials();
      const jiraKey = body.jira_key || body.key;

      if (jiraKey) {
        const existing = data.stories.find((s) => s.key === jiraKey);
        if (existing) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ...existing, _existing: true }));
        }
        let fields = {
          title: body.title || "Untitled",
          description: body.description || "",
          acceptance_criteria: body.acceptance_criteria || "",
          definition_of_done: body.definition_of_done || "",
          component: body.component || "",
          priority: body.priority || "P2 — Critical",
          programme: body.programme || "CVEP",
          jira_status: "Ready for QA",
        };
        if (isJiraConfigured(creds)) {
          try {
            const mapped = await orchestrator.importStoryFromJira(creds, jiraKey);
            fields = { ...fields, ...mapped, acceptance_criteria: mapped.acceptance_criteria || fields.acceptance_criteria };
          } catch (e) {
            res.writeHead(502, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ detail: `Could not fetch ${jiraKey} from Jira: ${e.message}` }));
          }
        }
        const story = {
          id: data.nextId++,
          key: jiraKey,
          title: fields.title,
          description: fields.description,
          acceptance_criteria: fields.acceptance_criteria,
          definition_of_done: fields.definition_of_done,
          component: fields.component,
          priority: fields.priority,
          programme: fields.programme,
          sprint_lane: body.sprint_lane || "Board 154",
          jira_status: fields.jira_status || "Ready for QA",
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
        };
        data.stories.push(story);
        saveData(data);
        res.writeHead(201, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(story));
      }

      const story = {
        id: data.nextId++, key: `VCPCORE-${data.nextKey++}`,
        title: body.title || "Untitled", description: body.description || "",
        acceptance_criteria: body.acceptance_criteria || "", definition_of_done: body.definition_of_done || "",
        component: body.component || "", priority: body.priority || "P2 — Critical",
        programme: body.programme || "CVEP", sprint_lane: body.sprint_lane || "Board 154",
        jira_status: "Ready for QA", phase: "intake",
        knowledge_context: "", review_status: "pending", review_notes: "",
        xray_published: false, automation_priority: "", automation_pr_url: "",
        test_cases: [], defects: [], agent_runs: [],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      data.stories.push(story);
      saveData(data);
      res.writeHead(201, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(story));
    }
    const storyMatch = url.pathname.match(/^\/api\/stories\/(\d+)(\/advance|\/review|\/generate-test-cases)?$/);
    if (storyMatch) {
      const id = parseInt(storyMatch[1], 10);
      if (req.method === "GET" && !storyMatch[2]) {
        const story = data.stories.find(s => s.id === id);
        if (!story) { res.writeHead(404); return res.end(JSON.stringify({ detail: "Not found" })); }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(story));
      }
      if (storyMatch[2] === "/advance" && req.method === "POST") {
        const r = await advanceStory(data, id);
        if (r.error) { res.writeHead(r.status); return res.end(JSON.stringify({ detail: r.error })); }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(r.body));
      }
      if (storyMatch[2] === "/generate-test-cases" && req.method === "POST") {
        const r = await generateTestCasesForStory(data, id);
        if (r.error) { res.writeHead(r.status); return res.end(JSON.stringify({ detail: r.error })); }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(r.body));
      }
      if (storyMatch[2] === "/review" && req.method === "POST") {
        const body = await readBody(req);
        const r = reviewStory(data, id, !!body.approved, body.notes || "");
        if (r.error) { res.writeHead(r.status); return res.end(JSON.stringify({ detail: r.error })); }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(r.body));
      }
    }
    if (url.pathname === "/api/dashboard/stats" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(getStats(data)));
    }
    if (url.pathname === "/api/test-cases" && req.method === "GET") {
      const tcs = data.stories.flatMap((s) =>
        s.test_cases.map((tc) => ({ ...tc, story_id: s.id, story_key: s.key }))
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(tcs));
    }
    const tcMatch = url.pathname.match(/^\/api\/stories\/(\d+)\/test-cases\/(\d+)(\/upload-xray)?$/);
    if (tcMatch && req.method === "PATCH" && !tcMatch[3]) {
      const storyId = parseInt(tcMatch[1], 10);
      const tcId = parseInt(tcMatch[2], 10);
      const body = await readBody(req);
      const r = updateTestCase(data, storyId, tcId, body);
      if (r.error) {
        res.writeHead(r.status, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: r.error }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(r.body));
    }
    if (tcMatch && tcMatch[3] === "/upload-xray" && req.method === "POST") {
      const storyId = parseInt(tcMatch[1], 10);
      const tcId = parseInt(tcMatch[2], 10);
      const r = await uploadTestCaseToXray(data, storyId, tcId);
      if (r.error) {
        res.writeHead(r.status, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: r.error }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(r.body));
    }
    if (url.pathname === "/api/qa-resources" && req.method === "GET") {
      const members = await loadQaResources();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(members));
    }
    if (url.pathname === "/api/defects" && req.method === "GET") {
      const defs = defectsCatalog.listAllDefects(data.stories);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(defs));
    }
    if (url.pathname === "/api/cxo/briefing" && req.method === "GET") {
      const release = cxoBriefing.getReleaseStatus();
      const defects = defectsCatalog.defectCounts(data.stories);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        ...cxoBriefing.getBriefing(),
        live: { ...release, ...defects },
      }));
    }
    if (url.pathname === "/api/defects/analysis" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(defectAnalysis.buildAnalysis(data.stories)));
    }
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok" }));
    }

    if (url.pathname === "/api/integrations/status" && req.method === "GET") {
      const creds = loadCredentials();
      const status = await orchestrator.getIntegrationStatus(creds);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ...status, credentials: maskCredentials(creds) }));
    }
    if (url.pathname === "/api/integrations/credentials" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(maskCredentials(loadCredentials())));
    }
    if (url.pathname === "/api/integrations/credentials" && req.method === "POST") {
      const body = await readBody(req);
      const saved = saveCredentials(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, credentials: saved }));
    }
    if (url.pathname === "/api/integrations/jira/sync" && req.method === "POST") {
      const creds = loadCredentials();
      if (!isJiraConfigured(creds)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: "Jira credentials not configured. Save them in Integrations first." }));
      }
      try {
        const result = await orchestrator.syncStoriesFromJira(creds, data);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: e.message }));
      }
    }
    if (url.pathname === "/api/integrations/jira/stories" && req.method === "GET") {
      const creds = loadCredentials();
      if (!isJiraConfigured(creds)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ connected: false, stories: [] }));
      }
      try {
        const stories = await orchestrator.listJiraStoriesForPicker(creds);
        const localKeys = new Set(data.stories.map((s) => s.key));
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          connected: true,
          stories: stories.map((s) => ({ ...s, imported: localKeys.has(s.key) })),
        }));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: e.message }));
      }
    }
    const jiraIssueMatch = url.pathname.match(/^\/api\/integrations\/jira\/issue\/([A-Z]+-\d+)$/);
    if (jiraIssueMatch && req.method === "GET") {
      const creds = loadCredentials();
      if (!isJiraConfigured(creds)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: "Jira not configured" }));
      }
      try {
        const mapped = await orchestrator.importStoryFromJira(creds, jiraIssueMatch[1]);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(mapped));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: e.message }));
      }
    }
    if (url.pathname === "/api/integrations/jira/test" && req.method === "POST") {
      const creds = loadCredentials();
      if (!isJiraConfigured(creds)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: "Jira not configured" }));
      }
      try {
        const jira = require("./integrations/jira");
        const r = await jira.testConnection(creds);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: true, user: r.account?.displayName || r.account?.emailAddress }));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: e.message }));
      }
    }
    if (url.pathname === "/api/integrations/xray/test" && req.method === "POST") {
      const creds = loadCredentials();
      try {
        const xray = require("./integrations/xray");
        await xray.testConnection(creds);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ detail: e.message }));
      }
    }

    if (url.pathname === "/docs/vikingcloud-flow" || url.pathname === "/vikingcloud-flow") {
      const doc = path.join(ROOT, "..", "web", "vikingcloud-e2e-flow.html");
      if (fs.existsSync(doc)) {
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(fs.readFileSync(doc));
      }
    }

    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    if (filePath.startsWith("/static/")) filePath = filePath.slice(7);
    const full = path.join(ROOT, "frontend", filePath === "/index.html" ? "index.html" : filePath.replace(/^\//, ""));
    if (full.startsWith(path.join(ROOT, "frontend")) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      const ext = path.extname(full);
      res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
      return res.end(fs.readFileSync(full));
    }
    if (url.pathname === "/" || (!path.extname(url.pathname) && !url.pathname.startsWith("/api/"))) {
      const idx = path.join(ROOT, "frontend", "index.html");
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(fs.readFileSync(idx));
    }
    res.writeHead(404); res.end("Not found");
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: e.message }));
  }
});

server.listen(PORT, HOST, () => {
  const cfg = auth.getConfig();
  const bind = HOST === "0.0.0.0" ? "all interfaces" : HOST;
  console.log(`Agentic QE Platform: http://${HOST === "0.0.0.0" ? "127.0.0.1" : HOST}:${PORT} (${bind})`);
  if (cfg.enabled) {
    const modeLabel = cfg.authMode === "access_code" ? "team access code" : "Microsoft Entra ID";
    console.log(`Auth: ${modeLabel} | domains: ${cfg.allowedDomains.join(", ")}`);
    console.log(`Public URL: ${cfg.publicBaseUrl}`);
  } else {
    console.log("Auth: disabled (set AUTH_ENABLED=true in .env for production)");
  }
});
