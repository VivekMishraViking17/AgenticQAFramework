import { Stories, Dashboard, Catalog, Integrations, Cxo } from "./api.js";
import { VC_E2E_STAGES, VC_LAYERS, VC_MILESTONES } from "./vc-flow-data.js";

const PHASES = [
  "intake", "knowledge", "design", "review", "xray", "auto_plan", "codegen", "execute", "done",
];
const PHASE_LABELS = {
  intake: "Story Intake",
  knowledge: "Knowledge Retrieval",
  design: "Test Design",
  review: "QA SME Review",
  xray: "XRay Sync",
  auto_plan: "Automation Plan",
  codegen: "Script Generation",
  execute: "Execute & Defect",
  done: "Completed",
};

let state = {
  role: localStorage.getItem("qe-role") || "QE Lead",
  selectedStoryId: null,
  vcStageId: localStorage.getItem("vc-stage") || "intake",
};

const TC_LABELS = [
  "functional", "edge-case", "security", "data-centric",
  "non-functional", "uat", "api-contract", "regression",
];
const TC_PRIORITIES = [
  "P1", "P1 — Deal Breaker", "P2 — Critical", "P3 — Highly Desirable", "P4 — Nice to Have",
];

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function optionList(values, selected) {
  const all = selected && !values.includes(selected) ? [selected, ...values] : values;
  return all.map((v) => `<option value="${escHtml(v)}" ${v === selected ? "selected" : ""}>${escHtml(v)}</option>`).join("");
}

function $(sel) { return document.querySelector(sel); }

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function toast(msg) {
  const t = el("div", "toast", msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function badgePhase(phase) {
  return `<span class="badge badge-phase">${PHASE_LABELS[phase] || phase}</span>`;
}

function pipelineHtml(phase) {
  const idx = PHASES.indexOf(phase);
  return PHASES.filter((p) => p !== "done").map((p, i) => {
    let cls = "pipe-step";
    if (i < idx) cls += " done";
    if (p === phase) cls += " current";
    return `<span class="${cls}">${PHASE_LABELS[p]?.split(" ")[0] || p}</span>`;
  }).join("");
}

function showToastError(err) {
  toast("Error: " + (err.message || err));
}

function formatTokens(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function formatUsd(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

async function navigate(view, params = {}) {
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.view === view);
  });
  const main = $("#main-content");
  main.innerHTML = '<div class="empty">Loading...</div>';
  try {
    switch (view) {
      case "dashboard": main.innerHTML = await renderDashboard(); break;
      case "stories": main.innerHTML = await renderStories(params); break;
      case "story": main.innerHTML = await renderStoryDetail(params.id); break;
      case "testcase": main.innerHTML = await renderTestCaseEditor(params.storyId, params.tcId); break;
      case "review": main.innerHTML = await renderReviewQueue(); break;
      case "testcases": main.innerHTML = await renderTestCases(); break;
      case "defects": main.innerHTML = await renderDefects(params); break;
      case "analysis": main.innerHTML = await renderDefectAnalysis(params); break;
      case "cxo": main.innerHTML = await renderCxoBriefing(params); break;
      case "lifecycle": main.innerHTML = renderLifecycle(); break;
      case "vcprocess": main.innerHTML = renderVcProcess(); break;
      case "raci": main.innerHTML = renderRaci(); break;
      case "roi": main.innerHTML = await renderRoi(params); break;
      case "integrations": main.innerHTML = await renderIntegrations(); break;
      default: main.innerHTML = await renderDashboard();
    }
    bindViewEvents(view, params);
    if (view === "vcprocess") bindVcProcessEvents();
  } catch (e) {
    main.innerHTML = `<div class="empty">Failed to load: ${e.message}</div>`;
  }
}

async function renderDashboard() {
  const s = await Dashboard.stats();
  let modeBadge = "";
  try {
    const integ = await Integrations.status();
    const cls = integ.mode === "live" ? "badge-green" : "badge-warn";
    modeBadge = `<button type="button" class="badge ${cls} badge-link" data-nav="integrations" title="Open integrations">${integ.mode === "live" ? "● Live Jira/XRay" : "○ Simulated"}</button>`;
  } catch { /* ignore */ }
  const phaseBars = Object.entries(s.by_phase)
    .map(([p, c]) => `
      <button type="button" class="dash-phase-row" data-nav="stories" data-phase="${escHtml(p)}" title="View stories in ${PHASE_LABELS[p] || p}">
        <span>${PHASE_LABELS[p] || p}</span><strong>${c}</strong>
      </button>`)
    .join("");
  return `
    <div class="page-header"><h1>Dashboard</h1><p>Agentic QE operations · Role: ${state.role}${modeBadge}</p></div>
    <div class="stats-grid">
      <button type="button" class="stat-card stat-card-link" data-nav="stories" title="View all Jira stories">
        <div class="val">${s.total_stories}</div><div class="lbl">Active Stories</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="testcases" title="Open test case repository">
        <div class="val">${s.total_test_cases}</div><div class="lbl">Test Cases</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="testcases" data-filter="approved" title="View approved test cases">
        <div class="val green">${s.approved_test_cases}</div><div class="lbl">Approved TCs</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="review" title="Open QA review queue">
        <div class="val">${s.pending_reviews}</div><div class="lbl">Pending Reviews</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="testcases" data-filter="traceable" title="View test cases with XRay traceability">
        <div class="val green">${s.traceability_pct}%</div><div class="lbl">Traceability</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="stories" data-filter="agent-runs" title="View stories with recent agent activity">
        <div class="val">${s.agent_runs_today}</div><div class="lbl">Agent Runs (24h)</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="defects" data-filter="open" title="View open & PO-review defects">
        <div class="val ${s.open_defects > 0 ? "caution" : ""}">${s.open_defects}</div><div class="lbl">Open Defects</div>
      </button>
      <button type="button" class="stat-card stat-card-link stat-card-analysis" data-nav="analysis" data-filter="escape" title="Escape defects drill-down — ${s.escape_rate_pct ?? 3}% escape rate">
        <div class="val ${(s.escape_rate_pct || 0) <= 5 ? "green" : "caution"}">${s.escape_rate_pct ?? 3.0}%</div>
        <div class="lbl">Analysis · Escape rate →</div>
      </button>
      <button type="button" class="stat-card stat-card-link stat-card-cxo" data-nav="cxo" title="CXO release health readout">
        <div class="val green">${s.cxo_pass_rate || "84%"}</div><div class="lbl">CXO Report · ${escHtml(s.cxo_release_status || "Conditional Go")}</div>
      </button>
      <button type="button" class="stat-card stat-card-link" data-nav="roi" title="View live ROI breakdown">
        <div class="val green">${s.roi_multiple}×</div><div class="lbl">Real-time ROI</div>
      </button>
      <button type="button" class="stat-card stat-card-link ${s.tokens_exhausted ? "stat-card-warn" : s.tokens_pct >= 80 ? "stat-card-caution" : ""}" data-nav="roi" data-filter="tokens" title="Monthly agent token budget usage">
        <div class="val ${s.tokens_exhausted ? "warn" : s.tokens_pct >= 80 ? "caution" : ""}">${s.tokens_exhausted ? "Exhausted" : `${s.tokens_pct}%`}</div>
        <div class="lbl">Token Usage · ${formatTokens(s.tokens_used)}/${formatTokens(s.tokens_limit)}</div>
      </button>
    </div>
    <div class="grid2">
      <div class="card"><h3>Stories by Phase</h3>${phaseBars || "<p class='empty'>No stories yet</p>"}</div>
      <div class="card">
        <h3>Quick Actions</h3>
        <div class="btn-row">
          <button class="btn btn-primary" data-action="new-story">+ New Story</button>
          <button class="btn btn-outline" data-nav="review">Review Queue (${s.pending_reviews})</button>
          <button class="btn btn-outline" data-nav="stories">All Stories</button>
          <button class="btn btn-outline" data-nav="defects" data-filter="open">Open Defects (${s.open_defects})</button>
          <button class="btn btn-outline" data-nav="analysis">Defect Analysis</button>
          <button class="btn btn-primary" data-nav="cxo">CXO Report</button>
          <button class="btn btn-outline" data-nav="integrations">Integrations</button>
        </div>
      </div>
    </div>`;
}

async function renderStories(params = {}) {
  let stories = await Stories.list();
  let filterNote = "";
  if (params.phase) {
    stories = stories.filter((s) => s.phase === params.phase);
    filterNote = `<div class="dash-filter-bar">Filtered by phase: <strong>${PHASE_LABELS[params.phase] || params.phase}</strong>
      <button type="button" class="btn btn-outline btn-sm" data-nav="stories">Clear filter</button></div>`;
  } else if (params.filter === "agent-runs") {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    stories = stories.filter((s) =>
      (s.agent_runs || []).some((r) => new Date(r.created_at).getTime() >= since)
    );
    filterNote = `<div class="dash-filter-bar">Showing stories with agent runs in the last 24 hours
      <button type="button" class="btn btn-outline btn-sm" data-nav="stories">Clear filter</button></div>`;
  }
  const rows = stories.map((s) => `
    <tr data-story-id="${s.id}" style="cursor:pointer">
      <td><strong>${s.key}</strong></td>
      <td>${s.title}</td>
      <td>${badgePhase(s.phase)}</td>
      <td><span class="badge badge-label">${s.jira_status || "Ready for QA"}</span></td>
      <td><span class="badge badge-${(s.priority||"P2").charAt(1).toLowerCase()||"p2"}">${s.priority || "P2"}</span></td>
      <td>${s.test_cases?.length || 0}</td>
      <td>${s.component || "—"}</td>
    </tr>`).join("");
  return `
    <div class="page-header">
      <h1>Jira Stories</h1>
      <p>Intake through execution — click a story to manage workflow</p>
    </div>
    ${filterNote}
    <div class="btn-row" style="margin-bottom:1rem">
      <button class="btn btn-primary" data-action="new-story">+ New Story</button>
      <button class="btn btn-outline" data-action="sync-jira">↻ Sync from Jira</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr><th>Key</th><th>Title</th><th>Agent Phase</th><th>Jira Status</th><th>Priority</th><th>TCs</th><th>Component</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">No stories</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function renderStoryDetail(id) {
  const s = await Stories.get(id);
  state.selectedStoryId = id;
  const tcs = (s.test_cases || []).map((tc) => `
    <div class="tc-card tc-card-click" data-nav="testcase" data-story-id="${s.id}" data-tc-id="${tc.id}" title="Click to edit & upload to XRay">
      <div class="tc-title">${escHtml(tc.title)} <span class="badge badge-label">${escHtml(tc.label)}</span> ${tc.approved ? "✓" : ""}</div>
      <div style="color:var(--muted)">${escHtml(tc.steps)}</div>
      <div style="margin-top:.25rem"><strong>Expected:</strong> ${escHtml(tc.expected_result)}</div>
      ${tc.reviewer ? `<div style="font-size:.75rem;margin-top:.25rem;color:var(--navy)"><strong>Reviewer:</strong> ${escHtml(tc.reviewer)}</div>` : `<div style="font-size:.7rem;margin-top:.25rem;color:var(--warn)">No QA reviewer assigned</div>`}
      ${tc.xray_key ? `<div style="font-size:.7rem;color:var(--cyan-d)">XRay: ${escHtml(tc.xray_key)}</div>` : `<div style="font-size:.7rem;margin-top:.25rem;color:var(--muted)">Click to review & upload →</div>`}
    </div>`).join("") || "<p class='empty'>No test cases yet — click <strong>Generate Test Cases</strong> below</p>";

  const runs = (s.agent_runs || []).slice().reverse().map((r) => `
    <div class="timeline-item">
      <div class="agent">${r.agent_name}</div>
      <div>${r.output_summary}</div>
      <div class="time">${new Date(r.created_at).toLocaleString()} · ${r.duration_ms}ms</div>
    </div>`).join("") || "<p style='color:var(--muted);font-size:.8rem'>No agent runs yet</p>";

  const defects = (s.defects || []).map((d) => `
    <div class="tc-card tc-card-click" data-nav="defects" data-filter="open" data-highlight="${escHtml(d.key)}" title="View in Defects">
      <strong>${escHtml(d.key)}</strong> · ${escHtml(d.title)}
      <div style="font-size:.75rem;color:var(--muted)">${escHtml(d.labels)} · ${escHtml(d.severity)} · ${escHtml(d.status)}</div>
    </div>`).join("");

  const canAdvance = s.phase !== "done" && s.phase !== "review";
  const inReview = s.phase === "review";
  const canReview = inReview && state.role === "QA SME";
  const hasTestCases = (s.test_cases?.length || 0) > 0;
  const canGenerateTc = s.phase !== "done" && !inReview;

  return `
    <div class="page-header">
      <button class="btn btn-outline btn-sm" data-nav="stories" style="margin-bottom:.5rem">← Back</button>
      <h1>${s.key}: ${s.title}</h1>
      <p>${badgePhase(s.phase)} · <span class="badge badge-label">${s.jira_status || "Ready for QA"}</span> · ${s.programme || "CVEP"} · ${s.component} · ${s.priority}</p>
    </div>
    <div class="pipeline">${pipelineHtml(s.phase)}</div>
    <div class="grid2">
      <div class="card">
        <h3>Story Details</h3>
        <p style="font-size:.85rem;margin-bottom:.5rem"><strong>Description:</strong> ${s.description || "—"}</p>
        <p style="font-size:.85rem;margin-bottom:.5rem"><strong>Acceptance Criteria:</strong><br>${(s.acceptance_criteria || "—").replace(/\n/g, "<br>")}</p>
        <p style="font-size:.85rem"><strong>DOD:</strong><br>${(s.definition_of_done || "—").replace(/\n/g, "<br>")}</p>
        ${s.knowledge_context ? `<p style="font-size:.8rem;margin-top:.75rem;color:var(--cyan-d)"><strong>Knowledge:</strong><br>${s.knowledge_context.replace(/\n/g, "<br>")}</p>` : ""}
        ${s.automation_pr_url ? `<p style="font-size:.8rem;margin-top:.5rem"><strong>PR:</strong> <a href="#">${s.automation_pr_url}</a></p>` : ""}
        <div class="btn-row">
          ${canAdvance ? `<button class="btn btn-accent" data-action="advance" data-id="${s.id}">Run Agent & Advance →</button>` : ""}
          ${canGenerateTc ? `<button class="btn btn-primary" data-action="generate-tc" data-id="${s.id}">${hasTestCases ? "Regenerate Test Cases" : "Generate Test Cases"}</button>` : ""}
          ${inReview && !canReview ? `<span style="font-size:.8rem;color:var(--muted)">Awaiting QA SME review (switch role)</span>` : ""}
          ${canReview ? `
            <button class="btn btn-success btn-sm" data-action="approve" data-id="${s.id}">Approve</button>
            <button class="btn btn-danger btn-sm" data-action="reject" data-id="${s.id}">Reject</button>` : ""}
          ${inReview && canReview ? "" : inReview && state.role === "QA SME" ? "" : ""}
          ${s.phase === "review" && state.role === "QE Lead" ? `<button class="btn btn-outline btn-sm" data-action="approve" data-id="${s.id}">Approve (Lead)</button>` : ""}
        </div>
        ${s.review_notes ? `<p style="font-size:.8rem;margin-top:.5rem;color:var(--warn)">Review: ${s.review_notes}</p>` : ""}
      </div>
      <div class="card">
        <h3>Agent Activity Log</h3>
        <div class="timeline">${runs}</div>
      </div>
    </div>
    <div class="card">
      <h3>Test Cases (${s.test_cases?.length || 0})</h3>
      ${tcs}
    </div>
    ${defects ? `<div class="card"><h3>Defects <button type="button" class="btn btn-outline btn-sm" data-nav="defects" data-filter="open">View all →</button></h3>${defects}</div>` : ""}`;
}

function normalizeStepsList(tc) {
  if (tc.steps_list?.length) return tc.steps_list;
  return [{ id: 1, action: tc.steps || "", data: "", expected: tc.expected_result || "" }];
}

function renderXrayStepRows(steps) {
  return steps.map((s, i) => `
    <tr class="xray-step-row" data-step-id="${s.id || i + 1}">
      <td class="xray-step-num">${i + 1}</td>
      <td><textarea class="xray-field" data-step-field="action" rows="2" placeholder="Action to perform">${escHtml(s.action || "")}</textarea></td>
      <td><textarea class="xray-field" data-step-field="data" rows="2" placeholder="Test data">${escHtml(s.data || "")}</textarea></td>
      <td><textarea class="xray-field" data-step-field="expected" rows="2" placeholder="Expected result">${escHtml(s.expected || "")}</textarea></td>
      <td class="xray-step-actions"><button type="button" class="xray-icon-btn" data-action="remove-step" title="Remove step">×</button></td>
    </tr>`).join("");
}

function collectStepsFromEditor() {
  return [...document.querySelectorAll(".xray-step-row")].map((row, i) => ({
    id: parseInt(row.dataset.stepId, 10) || i + 1,
    action: row.querySelector('[data-step-field="action"]')?.value || "",
    data: row.querySelector('[data-step-field="data"]')?.value || "",
    expected: row.querySelector('[data-step-field="expected"]')?.value || "",
  }));
}

function nextStepId() {
  const rows = document.querySelectorAll(".xray-step-row");
  let max = 0;
  rows.forEach((r) => { max = Math.max(max, parseInt(r.dataset.stepId, 10) || 0); });
  return max + 1;
}

function appendXrayStepRow(action = "", data = "", expected = "") {
  const tbody = document.getElementById("xray-steps-body");
  if (!tbody) return;
  const id = nextStepId();
  const idx = tbody.querySelectorAll(".xray-step-row").length + 1;
  const tr = document.createElement("tr");
  tr.className = "xray-step-row";
  tr.dataset.stepId = String(id);
  tr.innerHTML = `
    <td class="xray-step-num">${idx}</td>
    <td><textarea class="xray-field" data-step-field="action" rows="2" placeholder="Action to perform">${escHtml(action)}</textarea></td>
    <td><textarea class="xray-field" data-step-field="data" rows="2" placeholder="Test data">${escHtml(data)}</textarea></td>
    <td><textarea class="xray-field" data-step-field="expected" rows="2" placeholder="Expected result">${escHtml(expected)}</textarea></td>
    <td class="xray-step-actions"><button type="button" class="xray-icon-btn" data-action="remove-step" title="Remove step">×</button></td>`;
  tbody.appendChild(tr);
  renumberXraySteps();
  bindXrayStepRowEvents(tr);
}

function renumberXraySteps() {
  document.querySelectorAll(".xray-step-row").forEach((row, i) => {
    const num = row.querySelector(".xray-step-num");
    if (num) num.textContent = String(i + 1);
  });
}

function bindXrayStepRowEvents(scope) {
  (scope ? [scope] : document.querySelectorAll(".xray-step-row")).forEach((row) => {
    row.querySelector("[data-action=remove-step]")?.addEventListener("click", () => {
      if (document.querySelectorAll(".xray-step-row").length <= 1) {
        toast("At least one step is required");
        return;
      }
      row.remove();
      renumberXraySteps();
    });
  });
}

async function renderTestCaseEditor(storyId, tcId) {
  const s = await Stories.get(storyId);
  const tc = (s.test_cases || []).find((t) => t.id === tcId);
  if (!tc) return `<div class="empty">Test case not found. <button class="btn btn-outline btn-sm" data-nav="story" data-id="${storyId}">Back to story</button></div>`;

  let reviewers = [];
  try { reviewers = await Catalog.qaResources(); } catch { reviewers = []; }
  const reviewerOpts = (selected) =>
    `<option value="">— Select QA reviewer —</option>` +
    reviewers.map((n) => `<option value="${escHtml(n)}" ${n === selected ? "selected" : ""}>${escHtml(n)}</option>`).join("");

  const uploaded = !!tc.xray_key;
  const steps = normalizeStepsList(tc);
  const testKey = tc.xray_key || `DRAFT-${s.key}-${tc.id}`;
  const testTypes = ["Manual", "Automated", "Generic"];

  return `
    <div class="xray-editor">
      <div class="xray-issue-header">
        <button class="btn btn-outline btn-sm" data-nav="story" data-id="${storyId}">← ${escHtml(s.key)}</button>
        <div class="xray-issue-meta">
          <span class="xray-test-icon">T</span>
          <span class="xray-issue-key">${escHtml(testKey)}</span>
          <span class="badge badge-label">${escHtml(tc.label)}</span>
          ${uploaded ? `<span class="badge badge-green">In XRay</span>` : `<span class="badge badge-warn">Draft</span>`}
        </div>
      </div>

      <div class="xray-layout">
        <div class="xray-main">
          <form id="tc-editor-form" class="xray-form">
            <section class="xray-section">
              <h4 class="xray-section-title">Test Details</h4>
              <div class="xray-field-row">
                <label class="xray-label">Test Type</label>
                <select name="test_type" class="xray-input">${optionList(testTypes, tc.test_type || "Manual")}</select>
              </div>
              <div class="xray-field-row">
                <label class="xray-label required">Summary</label>
                <input name="title" class="xray-input xray-summary" value="${escHtml(tc.title)}" required />
              </div>
              <div class="xray-field-row">
                <label class="xray-label">Description</label>
                <textarea name="description" class="xray-input" rows="2" placeholder="Optional test description">${escHtml(tc.description || "")}</textarea>
              </div>
              <div class="xray-field-row">
                <label class="xray-label">Precondition</label>
                <textarea name="precondition" class="xray-input" rows="2" placeholder="Conditions that must be true before executing">${escHtml(tc.precondition || "")}</textarea>
              </div>
            </section>

            <section class="xray-section">
              <div class="xray-section-head">
                <h4 class="xray-section-title">Manual Test Steps</h4>
                <button type="button" class="btn btn-outline btn-sm" data-action="add-step">+ Add Step</button>
              </div>
              <div class="xray-steps-wrap">
                <table class="xray-steps-table">
                  <thead>
                    <tr>
                      <th class="xray-col-num">#</th>
                      <th>Action <span class="xray-req">*</span></th>
                      <th>Data</th>
                      <th>Expected Result</th>
                      <th class="xray-col-act"></th>
                    </tr>
                  </thead>
                  <tbody id="xray-steps-body">${renderXrayStepRows(steps)}</tbody>
                </table>
              </div>
            </section>

            <div class="xray-form-footer">
              <div class="form-check-group xray-checks">
                <label class="form-check">
                  <input type="checkbox" name="automation_candidate" ${tc.automation_candidate ? "checked" : ""} />
                  <span>Automation candidate</span>
                </label>
                <label class="form-check">
                  <input type="checkbox" name="approved" ${tc.approved ? "checked" : ""} />
                  <span>QA approved</span>
                </label>
              </div>
              <button type="submit" class="btn btn-primary">Save Test</button>
            </div>
          </form>
        </div>

        <aside class="xray-sidebar">
          <div class="xray-panel">
            <h4 class="xray-panel-title">Details</h4>
            <div class="xray-detail-row">
              <span class="xray-detail-label required">Assignee (QA)</span>
              <select id="tc-reviewer" class="xray-input" required ${uploaded ? "disabled" : ""} aria-required="true">${reviewerOpts(tc.reviewer || "")}</select>
              ${!tc.reviewer && !uploaded ? `<p class="field-hint warn">Required for XRay publish</p>` : ""}
            </div>
            <div class="xray-detail-row">
              <span class="xray-detail-label">Priority</span>
              <select name="priority" form="tc-editor-form" class="xray-input">${optionList(TC_PRIORITIES, tc.priority)}</select>
            </div>
            <div class="xray-detail-row">
              <span class="xray-detail-label">Category</span>
              <select name="label" form="tc-editor-form" class="xray-input">${optionList(TC_LABELS, tc.label)}</select>
            </div>
            <div class="xray-detail-row">
              <span class="xray-detail-label">Story</span>
              <a href="#" data-nav="story" data-id="${storyId}" class="xray-link">${escHtml(s.key)}</a>
            </div>
            <div class="xray-detail-row">
              <span class="xray-detail-label">Component</span>
              <span>${escHtml(s.component || "—")}</span>
            </div>
            <div class="xray-detail-row">
              <span class="xray-detail-label">Programme</span>
              <span>${escHtml(s.programme || "CVEP")}</span>
            </div>
          </div>

          <div class="xray-panel xray-publish-panel">
            <h4 class="xray-panel-title">XRay Publish</h4>
            <p class="xray-panel-desc">Save the test, assign QA, then publish to XRay Cloud.</p>
            <button type="button" class="btn btn-accent xray-upload-btn" data-action="upload-xray" data-story-id="${storyId}" data-tc-id="${tcId}" ${uploaded || !tc.reviewer ? "disabled" : ""}>
              ${uploaded ? "Published to XRay" : "Upload to XRay"}
            </button>
            ${uploaded ? `<p class="field-hint" style="color:var(--green)">Key: <strong>${escHtml(tc.xray_key)}</strong></p>` : ""}
          </div>
        </aside>
      </div>
    </div>`;
}

async function saveTestCaseEditor(storyId, tcId) {
  const form = document.getElementById("tc-editor-form");
  const fd = new FormData(form);
  const steps_list = collectStepsFromEditor();
  if (!steps_list.some((s) => s.action.trim())) {
    throw new Error("At least one step Action is required");
  }
  const patch = {
    title: fd.get("title"),
    description: fd.get("description"),
    precondition: fd.get("precondition"),
    test_type: fd.get("test_type"),
    label: document.querySelector('[form="tc-editor-form"][name="label"]')?.value,
    priority: document.querySelector('[form="tc-editor-form"][name="priority"]')?.value,
    steps_list,
    steps: steps_list.map((s) => s.action).join("\n"),
    expected_result: steps_list[steps_list.length - 1]?.expected || "",
    automation_candidate: form.querySelector('[name="automation_candidate"]').checked,
    approved: form.querySelector('[name="approved"]').checked,
    reviewer: document.getElementById("tc-reviewer")?.value || "",
  };
  await Catalog.updateTestCase(storyId, tcId, patch);
  toast("Test saved");
}

async function renderReviewQueue() {
  const stories = await Stories.list();
  const pending = stories.filter((s) => s.phase === "review");
  const cards = pending.map((s) => `
    <div class="card">
      <h3>${s.key}: ${s.title}</h3>
      <p style="font-size:.85rem;color:var(--muted)">${s.test_cases?.length || 0} test cases pending review</p>
      <div class="btn-row">
        <button class="btn btn-outline btn-sm" data-nav="story" data-id="${s.id}">Open</button>
        ${state.role === "QA SME" || state.role === "QE Lead" ? `
          <button class="btn btn-success btn-sm" data-action="approve" data-id="${s.id}">Approve</button>
          <button class="btn btn-danger btn-sm" data-action="reject" data-id="${s.id}">Reject</button>` : ""}
      </div>
    </div>`).join("");
  return `
    <div class="page-header"><h1>QA SME Review Queue</h1><p>Mandatory human gate before XRay publish</p></div>
    ${cards || '<div class="empty">No stories pending review</div>'}`;
}

async function renderTestCases(params = {}) {
  let tcs = [];
  let reviewers = [];
  try {
    [tcs, reviewers] = await Promise.all([Catalog.testCases(), Catalog.qaResources()]);
  } catch {
    try { tcs = await Catalog.testCases(); } catch { tcs = []; }
    reviewers = [];
  }
  let filterNote = "";
  if (params.filter === "approved") {
    tcs = tcs.filter((tc) => tc.approved);
    filterNote = `<div class="dash-filter-bar">Showing approved test cases only
      <button type="button" class="btn btn-outline btn-sm" data-nav="testcases">Clear filter</button></div>`;
  } else if (params.filter === "traceable") {
    tcs = tcs.filter((tc) => !!tc.xray_key);
    filterNote = `<div class="dash-filter-bar">Showing test cases linked to XRay (traceable)
      <button type="button" class="btn btn-outline btn-sm" data-nav="testcases">Clear filter</button></div>`;
  }
  const reviewerOpts = (selected) =>
    `<option value="">— Select reviewer —</option>` +
    reviewers.map((n) => `<option value="${escHtml(n)}" ${n === selected ? "selected" : ""}>${escHtml(n)}</option>`).join("");

  const rows = tcs.map((tc) => `
    <tr class="tc-edit-row" data-story-id="${tc.story_id}" data-tc-id="${tc.id}">
      <td><span class="tc-story-key">${escHtml(tc.story_key || "—")}</span></td>
      <td><input class="tc-in tc-in-sm" data-field="xray_key" value="${escHtml(tc.xray_key || "")}" placeholder="XR-…" /></td>
      <td><input class="tc-in" data-field="title" value="${escHtml(tc.title)}" /></td>
      <td><textarea class="tc-in tc-ta" data-field="steps" rows="2">${escHtml(tc.steps)}</textarea></td>
      <td><textarea class="tc-in tc-ta" data-field="expected_result" rows="2">${escHtml(tc.expected_result)}</textarea></td>
      <td><select class="tc-in" data-field="label">${optionList(TC_LABELS, tc.label)}</select></td>
      <td><select class="tc-in" data-field="priority">${optionList(TC_PRIORITIES, tc.priority)}</select></td>
      <td class="tc-center"><input type="checkbox" data-field="approved" ${tc.approved ? "checked" : ""} /></td>
      <td class="tc-center"><input type="checkbox" data-field="automation_candidate" ${tc.automation_candidate ? "checked" : ""} /></td>
      <td><select class="tc-in" data-field="reviewer">${reviewerOpts(tc.reviewer || "")}</select></td>
      <td><button type="button" class="btn btn-outline btn-sm" data-action="save-tc">Save</button></td>
    </tr>`).join("");

  return `
    <div class="page-header">
      <h1>Test Case Repository</h1>
      <p>Edit test cases inline · assign QA reviewer · changes save per row</p>
    </div>
    ${filterNote}
    <div class="card tc-table-wrap">
      <table class="tc-table">
        <thead><tr>
          <th>Story</th><th>XRay Key</th><th>Title</th><th>Steps</th><th>Expected</th>
          <th>Label</th><th>Priority</th><th>Approved</th><th>Auto</th><th>Reviewer</th><th></th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="11" class="empty">No test cases</td></tr>'}</tbody>
      </table>
    </div>`;
}

function collectTcRowPatch(row) {
  const patch = {};
  row.querySelectorAll("[data-field]").forEach((el) => {
    const field = el.dataset.field;
    if (el.type === "checkbox") patch[field] = el.checked;
    else patch[field] = el.value;
  });
  return patch;
}

async function saveTestCaseRow(row) {
  const storyId = parseInt(row.dataset.storyId, 10);
  const tcId = parseInt(row.dataset.tcId, 10);
  const patch = collectTcRowPatch(row);
  const btn = row.querySelector("[data-action=save-tc]");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
  try {
    await Catalog.updateTestCase(storyId, tcId, patch);
    row.classList.add("tc-saved");
    setTimeout(() => row.classList.remove("tc-saved"), 1200);
    toast("Test case saved");
  } catch (err) {
    showToastError(err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Save"; }
  }
}

async function renderDefects(params = {}) {
  const defects = await Catalog.defects();
  let list = defects;
  let filterNote = "";
  if (params.filter === "open") {
    list = defects.filter((d) => d.status === "Open" || d.status === "PO Review");
    filterNote = `<div class="dash-filter-bar">Showing open & PO-review defects (${list.length})
      <button type="button" class="btn btn-outline btn-sm" data-nav="defects">Show all</button>
      <button type="button" class="btn btn-outline btn-sm" data-nav="cxo">CXO Report →</button></div>`;
  }
  const rows = list.map((d) => {
    const sevCls = d.severity === "High" ? "badge-p1" : d.severity === "Medium" ? "badge-p2" : "badge-label";
    const stCls = d.status === "Open" ? "badge-warn" : d.status === "PO Review" ? "badge-label" : "badge-green";
    const storyLink = d.story_id
      ? `<button type="button" class="link-btn" data-nav="story" data-id="${d.story_id}">${escHtml(d.story_key || "Story")}</button>`
      : (d.story_key ? `<span class="tc-story-key">${escHtml(d.story_key)}</span>` : "—");
    return `
    <tr class="defect-row ${params.highlight === d.key ? "defect-row-highlight" : ""}" data-defect-key="${escHtml(d.key)}">
      <td><a href="${escHtml(d.jira_url || "#")}" target="_blank" rel="noopener" class="defect-jira-link"><strong>${escHtml(d.key)}</strong></a></td>
      <td>${escHtml(d.title)}</td>
      <td><span class="badge ${sevCls}">${escHtml(d.severity)}</span></td>
      <td>${escHtml(d.priority || "—")}</td>
      <td>${escHtml(d.workstream || d.component || "—")}</td>
      <td style="font-size:.75rem">${escHtml(d.labels || "")}</td>
      <td>${d.linked_test ? `<span class="badge badge-label">${escHtml(d.linked_test)}</span>` : "—"}</td>
      <td><span class="badge ${stCls}">${escHtml(d.status)}</span></td>
      <td>${storyLink}</td>
    </tr>`;
  }).join("");
  return `
    <div class="page-header">
      <h1>Defects</h1>
      <p>Board 154 · auto-filed from INT automation · linked to XRay & stories</p>
    </div>
    ${filterNote}
    <div class="btn-row" style="margin-bottom:1rem">
      <button type="button" class="btn btn-outline btn-sm" data-nav="defects" ${!params.filter ? "disabled" : ""}>All defects</button>
      <button type="button" class="btn btn-outline btn-sm" data-nav="defects" data-filter="open">Open only</button>
      <button type="button" class="btn btn-primary btn-sm" data-nav="cxo">CXO Report</button>
      <button type="button" class="btn btn-outline btn-sm" data-nav="analysis">Defect Analysis</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="defects-table">
        <thead><tr><th>Jira Key</th><th>Title</th><th>Severity</th><th>Priority</th><th>Workstream</th><th>Labels</th><th>XRay</th><th>Status</th><th>Story</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="empty">No defects</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function renderCxoBriefing(params = {}) {
  const b = await Cxo.briefing();
  const kpiCards = b.kpis.map((k) => {
    const tone = k.status === "green" ? "cxo-kpi-green" : k.status === "amber" ? "cxo-kpi-amber" : "cxo-kpi-red";
    const nav = k.id === "active-defects" ? 'data-nav="defects" data-filter="open"' : "";
    return `
      <button type="button" class="cxo-kpi ${tone}" ${nav} title="${escHtml(k.detail)}">
        <span class="cxo-kpi-val">${escHtml(k.value)}</span>
        <span class="cxo-kpi-label">${escHtml(k.label)}</span>
        <span class="cxo-kpi-detail">${escHtml(k.detail)}</span>
      </button>`;
  }).join("");

  const wsRows = b.workstreams.map((w) => {
    const stCls = w.statusTone === "green" ? "badge-green" : w.statusTone === "amber" ? "badge-warn" : "badge-danger";
    return `
      <tr>
        <td><strong>${escHtml(w.name)}</strong></td>
        <td>${escHtml(w.pass)}</td>
        <td><span class="badge ${stCls}">${escHtml(w.status)}</span></td>
        <td style="font-size:.8rem;color:var(--muted)">${escHtml(w.risk)}</td>
      </tr>`;
  }).join("");

  const relCls = b.release.status === "conditional" ? "cxo-release-conditional" : "cxo-release-go";

  return `
    <div class="cxo-page">
      <div class="cxo-hero">
        <p class="vc-hero-eyebrow">${escHtml(b.meta.title)} · ${escHtml(b.meta.date)}</p>
        <h1>Release Health — CXO Readout</h1>
        <p class="vc-hero-lead">${escHtml(b.headline)}</p>
        <div class="cxo-read-bar">${escHtml(b.cxoRead)}</div>
      </div>

      <div class="cxo-release-banner ${relCls}">
        <div>
          <span class="cxo-release-label">Release decision</span>
          <strong>${escHtml(b.release.statusLabel)}</strong>
          <p>${escHtml(b.release.summary)}</p>
        </div>
        <div class="cxo-release-meta">
          <div><span>Gate</span>${escHtml(b.release.targetGate)}</div>
          <div><span>Owner</span>${escHtml(b.release.owner)}</div>
          <div><span>Test set</span>${escHtml(b.meta.testSet)}</div>
          <div><span>INT</span>${escHtml(b.meta.environment)}</div>
        </div>
      </div>

      <div class="cxo-kpi-grid">${kpiCards}</div>

      <div class="grid2">
        <div class="card">
          <h3>Workstream scorecard</h3>
          <table class="cxo-ws-table">
            <thead><tr><th>Workstream</th><th>Pass</th><th>Status</th><th>Top risk</th></tr></thead>
            <tbody>${wsRows}</tbody>
          </table>
        </div>
        <div class="card">
          <h3>Sprint actions</h3>
          <ul class="cxo-action-list">${b.actions.map((a) => `<li>${escHtml(a)}</li>`).join("")}</ul>
          <div class="cxo-defect-insight">
            <strong>Defect insight</strong>
            <p>${escHtml(b.defectInsight)}</p>
            <button type="button" class="btn btn-outline btn-sm" data-nav="defects" data-filter="open">View ${b.live?.open_defects || b.defectSummary.active} open defects →</button>
          </div>
        </div>
      </div>

      <div class="cxo-milestone-row">
        <div class="cxo-milestone-card"><span class="vc-gate">M#1</span><strong>Engineering Smoke</strong><p>INT stable — blocks all QA</p></div>
        <div class="cxo-milestone-card cxo-milestone-focus"><span class="vc-gate">M#7</span><strong>QA Critical Path</strong><p>${escHtml(b.meta.testSet)} · checkout + JSIM header must green</p></div>
        <div class="cxo-milestone-card"><span class="vc-gate">M#12</span><strong>UAT Kickoff</strong><p>Production dummy-merchant UAT</p></div>
      </div>
    </div>`;
}

function analysisTone(status) {
  return status === "green" ? "ana-green" : status === "amber" ? "ana-amber" : "ana-red";
}

function anaBar(pct, tone = "") {
  return `<div class="ana-bar-track"><div class="ana-bar-fill ${tone}" style="width:${Math.min(100, pct)}%"></div></div>`;
}

async function renderDefectAnalysis(params = {}) {
  const a = await Catalog.defectAnalysis();
  const esc = a.escape_defects;
  const reo = a.qa_reopen;
  const activeFilter = params.filter || "";

  const filterLabels = {
    escape: "Escape defects",
    reopen: "QA reopen frequency",
    areas: "Impacted areas",
    pareto: "Pareto analysis",
    fishbone: "Fishbone root causes",
    traceability: "E2E traceability",
  };

  const filterNote = activeFilter ? `
    <div class="dash-filter-bar">
      Drilling into: <strong>${filterLabels[activeFilter] || activeFilter}</strong>
      <button type="button" class="btn btn-outline btn-sm" data-nav="analysis">Show full analysis</button>
    </div>` : "";

  const sectionCls = (id) => `card analysis-section ${activeFilter === id ? "card-highlight analysis-section-focus" : ""}`;

  const summaryCards = `
    <div class="ana-summary-grid">
      <button type="button" class="ana-summary-card ana-summary-link ${analysisTone(esc.status)} ${activeFilter === "escape" ? "ana-summary-active" : ""}" data-nav="analysis" data-filter="escape" title="View escape defect data">
        <span class="ana-summary-val">${esc.escape_rate_pct}%</span>
        <span class="ana-summary-lbl">Escape rate →</span>
        <span class="ana-summary-sub">${esc.escaped_production} prod · ${esc.uat_leaks} UAT · target ≤ ${esc.target_escape_pct}%</span>
      </button>
      <button type="button" class="ana-summary-card ana-summary-link ${analysisTone(reo.status)} ${activeFilter === "reopen" ? "ana-summary-active" : ""}" data-nav="analysis" data-filter="reopen">
        <span class="ana-summary-val">${reo.reopen_rate_pct}%</span>
        <span class="ana-summary-lbl">QA reopen →</span>
        <span class="ana-summary-sub">${reo.qa_reopened_count} reopened · ${reo.reopen_events} events</span>
      </button>
      <button type="button" class="ana-summary-card ana-summary-link ${activeFilter === "areas" ? "ana-summary-active" : ""}" data-nav="analysis" data-filter="areas">
        <span class="ana-summary-val">${escHtml(a.summary.top_impacted_area.split(" ")[0])}</span>
        <span class="ana-summary-lbl">Impacted area →</span>
        <span class="ana-summary-sub">${escHtml(a.summary.top_impacted_area)}</span>
      </button>
      <button type="button" class="ana-summary-card ana-summary-link ${a.traceability.defect_trace_pct >= 80 ? "ana-green" : "ana-amber"} ${activeFilter === "traceability" ? "ana-summary-active" : ""}" data-nav="analysis" data-filter="traceability">
        <span class="ana-summary-val">${a.traceability.defect_trace_pct}%</span>
        <span class="ana-summary-lbl">Traceability →</span>
        <span class="ana-summary-sub">Story → XRay → Defect</span>
      </button>
    </div>`;

  const escapeRows = esc.items.map((e) => `
    <tr class="escape-row" data-escape-key="${escHtml(e.key)}">
      <td><a href="https://vikingcloud.atlassian.net/browse/${escHtml(e.key)}" target="_blank" rel="noopener" class="defect-jira-link">${escHtml(e.key)}</a></td>
      <td>${escHtml(e.title)}</td>
      <td>${escHtml(e.workstream || "—")}</td>
      <td><span class="badge badge-${e.severity === "High" ? "p1" : "p2"}">${escHtml(e.severity)}</span></td>
      <td><span class="badge ${e.found_in === "Production" ? "badge-danger" : "badge-warn"}">${escHtml(e.found_in)}</span></td>
      <td>${e.days_after_release != null ? `${e.days_after_release}d post-release` : "—"}</td>
      <td><a href="https://vikingcloud.atlassian.net/browse/${escHtml(e.key)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="padding:.2rem .45rem;font-size:.68rem">Jira ↗</a></td>
    </tr>`).join("");

  const escapeDrilldown = activeFilter === "escape" ? `
    <div class="ana-drilldown ana-drilldown-escape">
      <div class="ana-drilldown-stats">
        <div><strong>${esc.escape_rate_pct}%</strong><span>Escape rate</span></div>
        <div><strong>${esc.escaped_production}</strong><span>Production escapes</span></div>
        <div><strong>${esc.uat_leaks}</strong><span>UAT leaks</span></div>
        <div><strong>${esc.qa_catch_rate_pct}%</strong><span>Caught in QA</span></div>
        <div><strong>${esc.items.length}</strong><span>Logged escape records</span></div>
      </div>
      <p class="ana-drilldown-formula">
        <strong>Calculation:</strong> ${esc.escaped_production} production escapes ÷ ${a.summary.total_defects} lifecycle defects = ${esc.escape_rate_pct}%
        (target ≤ ${esc.target_escape_pct}%)
      </p>
    </div>` : "";

  const reopenRows = reo.by_workstream.map((w) => `
    <tr>
      <td><strong>${escHtml(w.workstream)}</strong></td>
      <td>${w.reopens}</td>
      <td>${w.closed}</td>
      <td>${w.reopen_rate_pct}% ${anaBar(w.reopen_rate_pct, w.reopen_rate_pct > 20 ? "ana-bar-red" : w.reopen_rate_pct > 15 ? "ana-bar-amber" : "ana-bar-green")}</td>
    </tr>`).join("");

  const areaRows = a.impacted_areas.slice(0, 8).map((i) => `
    <tr>
      <td><strong>${escHtml(i.area)}</strong></td>
      <td>${i.count}</td>
      <td>${i.open > 0 ? `<span class="badge badge-warn">${i.open} open</span>` : "—"}</td>
      <td style="min-width:140px">${i.pct}% ${anaBar(i.pct)}</td>
    </tr>`).join("");

  const paretoRows = a.pareto.items.slice(0, 8).map((p) => `
    <tr>
      <td>${escHtml(p.area)}</td>
      <td>${p.count}</td>
      <td style="min-width:120px">${p.pct}% ${anaBar(p.pct, "ana-bar-navy")}</td>
      <td><strong>${p.cumulative_pct}%</strong></td>
    </tr>`).join("");

  const fishboneHtml = a.fishbone.categories.map((c) => `
    <div class="fishbone-bone">
      <div class="fishbone-bone-label">${escHtml(c.label)}</div>
      <div class="fishbone-bone-count">${c.count}</div>
      <div class="fishbone-bone-bar">${anaBar(Math.min(100, c.count * 3), "ana-bar-navy")}</div>
      ${c.examples.length ? `<div class="fishbone-examples">${c.examples.map((k) => `<span>${escHtml(k)}</span>`).join("")}</div>` : ""}
    </div>`).join("");

  const traceRows = a.traceability.chains.map((c) => {
    const stCls = c.status === "full" ? "badge-green" : c.status === "partial" ? "badge-warn" : "badge-danger";
    return `
    <tr>
      <td>${c.story_id ? `<button type="button" class="link-btn" data-nav="story" data-id="${c.story_id}">${escHtml(c.story_key)}</button>` : escHtml(c.story_key)}</td>
      <td style="font-size:.78rem">${escHtml(c.title)}</td>
      <td>${c.test_cases}</td>
      <td>${c.xray_linked}</td>
      <td>${c.defects}</td>
      <td><span class="badge ${stCls}">${c.status === "full" ? "Full chain" : c.status === "partial" ? "Partial" : "Gap"}</span></td>
    </tr>`;
  }).join("");

  const defectLinkRows = a.traceability.defect_links.map((d) => `
    <tr>
      <td><a href="https://vikingcloud.atlassian.net/browse/${escHtml(d.key)}" target="_blank" rel="noopener" class="defect-jira-link">${escHtml(d.key)}</a></td>
      <td>${escHtml(d.story)}</td>
      <td>${d.xray !== "—" ? `<span class="badge badge-label">${escHtml(d.xray)}</span>` : "—"}</td>
      <td>${d.complete ? "✓" : "✗"}</td>
    </tr>`).join("");

  return `
    <div class="analysis-page">
      <div class="page-header">
        <h1>Defect Analysis</h1>
        <p>${escHtml(a.period)} · Board 154 · ${a.summary.total_defects} lifecycle defects</p>
      </div>
      ${filterNote}
      ${summaryCards}
      ${escapeDrilldown}

      <div class="grid2">
        <div class="${sectionCls("escape")}" id="analysis-escape">
          <h3>Escape defects <span class="badge ${esc.status === "green" ? "badge-green" : "badge-warn"}">${esc.escaped_production} prod · ${esc.uat_leaks} UAT</span></h3>
          <p class="ana-insight">Defects found after QA sign-off — click a row to open in Jira. Target escape rate ≤ ${esc.target_escape_pct}%.</p>
          <table class="ana-table">
            <thead><tr><th>Key</th><th>Title</th><th>Area</th><th>Sev</th><th>Found in</th><th>Timing</th><th></th></tr></thead>
            <tbody>${escapeRows || "<tr><td colspan='7' class='empty'>No escapes</td></tr>"}</tbody>
          </table>
        </div>
        <div class="${sectionCls("reopen")}" id="analysis-reopen">
          <h3>QA reopen frequency</h3>
          <p class="ana-insight">Bugs closed then reopened by QA — signals fix quality or unclear AC.</p>
          <table class="ana-table">
            <thead><tr><th>Workstream</th><th>Reopens</th><th>Closed</th><th>Rate</th></tr></thead>
            <tbody>${reopenRows}</tbody>
          </table>
        </div>
      </div>

      <div class="grid2">
        <div class="${sectionCls("areas")}" id="analysis-areas">
          <h3>Impacted area</h3>
          <p class="ana-insight">Defect concentration by workstream / component.</p>
          <table class="ana-table">
            <thead><tr><th>Area</th><th>Total</th><th>Open</th><th>Share</th></tr></thead>
            <tbody>${areaRows}</tbody>
          </table>
        </div>
        <div class="${sectionCls("pareto")}" id="analysis-pareto">
          <h3>Pareto analysis (80/20)</h3>
          <p class="ana-insight">${escHtml(a.pareto.insight)}</p>
          <table class="ana-table">
            <thead><tr><th>Workstream</th><th>Count</th><th>%</th><th>Cumulative</th></tr></thead>
            <tbody>${paretoRows}</tbody>
          </table>
        </div>
      </div>

      <div class="${sectionCls("fishbone")}" id="analysis-fishbone">
        <h3>Fishbone (Ishikawa) — root cause categories</h3>
        <p class="ana-insight">${escHtml(a.fishbone.insight)}</p>
        <div class="fishbone-diagram">
          <div class="fishbone-spine">
            <span>Defect</span>
            <div class="fishbone-spine-line"></div>
            <span>Outcome</span>
          </div>
          <div class="fishbone-bones">${fishboneHtml}</div>
        </div>
      </div>

      <div class="${sectionCls("traceability")}" id="analysis-traceability">
        <h3>End-to-end traceability</h3>
        <p class="ana-insight">
          Jira Story → Test Cases → XRay keys → Linked defects.
          ${a.traceability.story_full_chain} full · ${a.traceability.story_partial} partial · ${a.traceability.story_broken} gaps
        </p>
        <div class="grid2" style="margin-top:.75rem">
          <div>
            <h4 style="font-size:.85rem;margin-bottom:.5rem">Story chains</h4>
            <table class="ana-table">
              <thead><tr><th>Story</th><th>Title</th><th>TCs</th><th>XRay</th><th>Defects</th><th>Chain</th></tr></thead>
              <tbody>${traceRows || "<tr><td colspan='6' class='empty'>No stories</td></tr>"}</tbody>
            </table>
          </div>
          <div>
            <h4 style="font-size:.85rem;margin-bottom:.5rem">Defect ↔ XRay ↔ Story links</h4>
            <table class="ana-table">
              <thead><tr><th>Defect</th><th>Story</th><th>XRay</th><th>Complete</th></tr></thead>
              <tbody>${defectLinkRows || "<tr><td colspan='4' class='empty'>No defects</td></tr>"}</tbody>
            </table>
          </div>
        </div>
        <div class="btn-row" style="margin-top:1rem">
          <button type="button" class="btn btn-outline btn-sm" data-nav="testcases" data-filter="traceable">View traceable TCs</button>
          <button type="button" class="btn btn-outline btn-sm" data-nav="defects" data-filter="open">Open defects</button>
          <button type="button" class="btn btn-outline btn-sm" data-nav="vcprocess">E2E Process map</button>
        </div>
      </div>
    </div>`;
}

function renderVcProcess() {
  const stage = VC_E2E_STAGES.find((s) => s.id === state.vcStageId) || VC_E2E_STAGES[1];
  const stageIndex = VC_E2E_STAGES.findIndex((s) => s.id === stage.id);

  const pipeline = VC_E2E_STAGES.map((s, i) => {
    const active = s.id === stage.id;
    const done = i < stageIndex;
    return `
      <button type="button" class="vc-node ${active ? "active" : ""} ${done ? "done" : ""}" data-vc-stage="${s.id}" title="${s.title}">
        <span class="vc-node-num">${s.num}</span>
        <span class="vc-node-label">${s.short}</span>
        <span class="vc-node-jira">${s.jiraStatus.split(" / ")[0]}</span>
      </button>
      ${i < VC_E2E_STAGES.length - 1 ? '<span class="vc-connector" aria-hidden="true"></span>' : ""}`;
  }).join("");

  const stakeholderChips = stage.stakeholders
    .map((sh) => `<span class="vc-chip">${escHtml(sh)}</span>`)
    .join("");

  const inputList = stage.inputs.map((x) => `<li>${escHtml(x)}</li>`).join("");
  const outputList = stage.outputs.map((x) => `<li>${escHtml(x)}</li>`).join("");

  return `
    <div class="vc-flow-page">
      <div class="vc-hero">
        <p class="vc-hero-eyebrow">VikingCloud · VCPCORE · Board 154</p>
        <h1>End-to-End Quality Process</h1>
        <p class="vc-hero-lead">Click any stage to see inputs, outputs, stakeholders, and deliverables — from Dev handoff through XRay, automation, and defect closure.</p>
        <div class="vc-layer-row">
          ${VC_LAYERS.map((l) => `<div class="vc-layer-pill"><strong>${l.label}</strong><span>${l.desc}</span></div>`).join("")}
        </div>
      </div>

      <div class="vc-pipeline-wrap">
        <p class="vc-pipeline-hint">Agentic QE lifecycle — select a stage</p>
        <div class="vc-pipeline">${pipeline}</div>
      </div>

      <div class="vc-detail">
        <div class="vc-detail-header">
          <div>
            <span class="vc-stage-badge">Stage ${stage.num}</span>
            <h2>${escHtml(stage.title)}</h2>
            <p class="vc-detail-sub">${escHtml(stage.agent)} · Jira: <strong>${escHtml(stage.jiraStatus)}</strong></p>
          </div>
          <div class="vc-detail-meta">
            ${stage.gate !== "—" ? `<div class="vc-meta-box"><span>Gate</span>${escHtml(stage.gate)}</div>` : ""}
            <div class="vc-meta-box"><span>Accountable</span>${escHtml(stage.accountable)}</div>
          </div>
        </div>

        <div class="vc-io-flow">
          <div class="vc-io-box vc-io-in">
            <h4>Inputs</h4>
            <ul>${inputList}</ul>
          </div>
          <div class="vc-io-arrow" aria-hidden="true">
            <svg viewBox="0 0 48 24" width="48" height="24"><path d="M0 12h40m0 0l-6-6m6 6l-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span>${escHtml(stage.short)}</span>
          </div>
          <div class="vc-io-box vc-io-out">
            <h4>Outputs</h4>
            <ul>${outputList}</ul>
          </div>
        </div>

        <div class="vc-detail-grid">
          <div class="vc-panel">
            <h4>Stakeholders</h4>
            <div class="vc-chip-row">${stakeholderChips}</div>
            ${stage.jiraTrigger ? `<p class="vc-note"><strong>Jira transition:</strong> ${escHtml(stage.jiraTrigger)}</p>` : ""}
          </div>
          <div class="vc-panel vc-panel-outcome">
            <h4>Outcome / Delivery</h4>
            <p class="vc-outcome">${escHtml(stage.deliverable)}</p>
            <div class="vc-measurable"><span>Success metric</span>${escHtml(stage.measurable)}</div>
          </div>
        </div>

        <div class="vc-nav-row">
          <button type="button" class="btn btn-outline btn-sm" data-vc-prev ${stageIndex <= 0 ? "disabled" : ""}>← Previous stage</button>
          <span class="vc-nav-pos">${stageIndex + 1} of ${VC_E2E_STAGES.length}</span>
          <button type="button" class="btn btn-outline btn-sm" data-vc-next ${stageIndex >= VC_E2E_STAGES.length - 1 ? "disabled" : ""}>Next stage →</button>
        </div>
      </div>

      <div class="vc-milestones">
        <h3>Programme milestone anchors</h3>
        <div class="vc-milestone-row">
          ${VC_MILESTONES.map((m) => `
            <div class="vc-milestone-card">
              <span class="vc-gate">${m.gate}</span>
              <strong>${escHtml(m.name)}</strong>
              <span>${escHtml(m.owner)}</span>
              <p>${escHtml(m.outcome)}</p>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

function bindVcProcessEvents() {
  document.querySelectorAll("[data-vc-stage]").forEach((btn) => {
    btn.onclick = () => {
      state.vcStageId = btn.dataset.vcStage;
      localStorage.setItem("vc-stage", state.vcStageId);
      navigate("vcprocess");
    };
  });
  const idx = VC_E2E_STAGES.findIndex((s) => s.id === state.vcStageId);
  document.querySelector("[data-vc-prev]")?.addEventListener("click", () => {
    if (idx > 0) {
      state.vcStageId = VC_E2E_STAGES[idx - 1].id;
      localStorage.setItem("vc-stage", state.vcStageId);
      navigate("vcprocess");
    }
  });
  document.querySelector("[data-vc-next]")?.addEventListener("click", () => {
    if (idx < VC_E2E_STAGES.length - 1) {
      state.vcStageId = VC_E2E_STAGES[idx + 1].id;
      localStorage.setItem("vc-stage", state.vcStageId);
      navigate("vcprocess");
    }
  });
}

function renderLifecycle() {
  return `
    <div class="page-header"><h1>Agile Circular Lifecycle</h1><p>Continuous sprint loop with human gates</p></div>
    <div class="grid2">
      <div class="card">
        <svg class="cycle-svg" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="155" fill="none" stroke="#eaecf0" stroke-width="2"/>
          <path d="M 200 45 A 155 155 0 1 1 199 45" fill="none" stroke="#23a3de" stroke-width="2.5" stroke-dasharray="10 5" marker-end="url(#arr)"/>
          <defs><marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3z" fill="#23a3de"/></marker></defs>
          <circle cx="200" cy="200" r="55" fill="#1d3c83"/>
          <text x="200" y="195" text-anchor="middle" fill="#66fcf9" font-size="10" font-weight="600">AGILE QE</text>
          <text x="200" y="210" text-anchor="middle" fill="#fff" font-size="9">LOOP</text>
          ${[
            [200,42,"01"],[310,88,"02"],[358,200,"03"],[310,312,"04"],
            [200,358,"05"],[90,312,"06"],[42,200,"07"],[90,88,"08"]
          ].map(([x,y,n]) => `<circle cx="${x}" cy="${y}" r="20" fill="#23569a" stroke="#66fcf9"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#fff" font-size="8">${n}</text>`).join("")}
        </svg>
      </div>
      <div class="card">
        <h3>Phase → Team → Outcome</h3>
        <table style="font-size:.75rem">
          <tr><td><strong>Intake</strong></td><td>PO, QE Ops</td><td>Parsed AC/DOD</td></tr>
          <tr><td><strong>Knowledge</strong></td><td>QA SME</td><td>Context bundle</td></tr>
          <tr><td><strong>Design</strong></td><td>QE Lead, Agents</td><td>8 labeled TCs</td></tr>
          <tr><td><strong>Review</strong></td><td>QA SME</td><td>Approved set</td></tr>
          <tr><td><strong>XRay</strong></td><td>QE Lead</td><td>100% linked</td></tr>
          <tr><td><strong>Automate</strong></td><td>SDET</td><td>Codegen PR</td></tr>
          <tr><td><strong>Execute</strong></td><td>SDET, Dev</td><td>Defects filed</td></tr>
        </table>
      </div>
    </div>`;
}

function renderRaci() {
  const rows = [
    ["Story Intake", "A", "C", "I", "I", "I", "C", "R"],
    ["Knowledge Retrieval", "C", "A", "C", "I", "I", "I", "R"],
    ["TC Generation", "I", "C", "A", "I", "I", "I", "R"],
    ["TC Review", "I", "A", "C", "C", "I", "I", "C"],
    ["XRay Publish", "I", "C", "A", "I", "I", "R", "R"],
    ["Automation Codegen", "I", "I", "C", "A", "C", "I", "R"],
    ["CI Execution", "I", "I", "C", "A", "C", "C", "R"],
    ["Defect Filing", "I", "C", "I", "C", "A", "I", "R"],
  ];
  const cls = { R: "raci-r", A: "raci-a", C: "raci-c", I: "raci-i" };
  const body = rows.map(([act, ...vals]) =>
    `<tr><td>${act}</td>${vals.map((v) => `<td class="${cls[v]}">${v}</td>`).join("")}</tr>`
  ).join("");
  return `
    <div class="page-header"><h1>RACI Matrix</h1><p>PO · QA SME · QE Lead · SDET · Dev · QE Ops · Agent</p></div>
    <div class="card" style="padding:0;overflow:auto">
      <table>
        <thead><tr><th>Activity</th><th>PO</th><th>QA SME</th><th>QE Lead</th><th>SDET</th><th>Dev</th><th>QE Ops</th><th>Agent</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

async function renderRoi(params = {}) {
  const s = await Dashboard.stats();
  const tokenBarPct = Math.min(100, s.tokens_pct || 0);
  const tokenBarClass = s.tokens_exhausted ? "token-bar-exhausted" : s.tokens_pct >= 80 ? "token-bar-caution" : "";
  const highlightTokens = params.filter === "tokens";
  return `
    <div class="page-header">
      <h1>Real-time ROI & Token Usage</h1>
      <p>Calculated from agent runs this month · QE labor @ $75/hr vs model token cost</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="val green">${s.roi_multiple}×</div><div class="lbl">ROI Multiple (live)</div></div>
      <div class="stat-card"><div class="val green">${formatUsd(s.labor_savings_usd)}</div><div class="lbl">Labor Saved (est.)</div></div>
      <div class="stat-card"><div class="val">${formatUsd(s.total_cost_usd)}</div><div class="lbl">Total Cost (tokens + platform)</div></div>
      <div class="stat-card"><div class="val ${s.tokens_exhausted ? "warn" : ""}">${formatTokens(s.tokens_used)}</div><div class="lbl">Tokens Used This Month</div></div>
    </div>
    <div class="roi-banner">
      <div><div class="big">${formatUsd(s.labor_savings_usd)}</div><div class="sub">Labor Savings (YTD month)</div></div>
      <div><div class="big">${formatUsd(s.ai_cost_usd)}</div><div class="sub">Token Spend</div></div>
      <div><div class="big">${formatUsd(s.total_cost_usd)}</div><div class="sub">Total Cost (incl. platform)</div></div>
      <div><div class="big">${s.roi_multiple}×</div><div class="sub">Real-time ROI</div></div>
      <div><div class="big">${formatTokens(s.tokens_remaining)}</div><div class="sub">Tokens Remaining</div></div>
    </div>
    <div class="card ${highlightTokens ? "card-highlight" : ""}" style="margin-top:1rem">
      <h3>Monthly Token Budget ${s.tokens_exhausted ? '<span class="badge badge-warn">Exhausted</span>' : ""}</h3>
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:.75rem">
        Period starts ${new Date(s.token_period_start).toLocaleDateString()} ·
        ${formatTokens(s.tokens_input)} input + ${formatTokens(s.tokens_output)} output tokens across agent runs
      </p>
      <div class="token-meter">
        <div class="token-meter-fill ${tokenBarClass}" style="width:${tokenBarPct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-top:.45rem;color:var(--muted)">
        <span>${formatTokens(s.tokens_used)} used</span>
        <span>${s.tokens_pct}% of ${formatTokens(s.tokens_limit)} limit</span>
      </div>
      ${s.tokens_exhausted ? `<p class="token-exhausted-note">Monthly token budget exhausted — new agent runs may be blocked until the next period or budget increase.</p>` : ""}
    </div>
    <div class="card" style="margin-top:1rem">
      <h3>How ROI is calculated</h3>
      <ul class="roi-calc-list">
        <li><strong>Labor saved:</strong> manual QE time avoided per phase (TC authoring ~45 min/TC vs ~12 min/batch with agent).</li>
        <li><strong>Total cost:</strong> token spend + $640/mo platform overhead (16 Cursor seats).</li>
        <li><strong>ROI:</strong> labor savings ÷ total cost — updates automatically as stories advance.</li>
      </ul>
    </div>`;
}

async function renderIntegrations() {
  const st = await Integrations.status();
  const c = st.credentials || {};
  const statusDot = (ok, configured) =>
    configured
      ? ok
        ? '<span class="badge badge-green">Connected</span>'
        : '<span class="badge badge-warn">Configured — not connected</span>'
      : '<span class="badge badge-label">Not configured</span>';

  return `
    <div class="page-header">
      <h1>Integrations</h1>
      <p>Secure local credential storage · Mode: <strong>${st.mode}</strong></p>
    </div>
    <div class="grid2">
      <div class="card">
        <h3>Connection Status</h3>
        <table style="font-size:.85rem">
          <tr><td>Jira / Confluence</td><td>${statusDot(st.jira?.connected, st.jira?.configured)} ${st.jira?.user ? `· ${st.jira.user}` : ""}</td></tr>
          <tr><td>XRay Cloud</td><td>${statusDot(st.xray?.connected, st.xray?.configured)}</td></tr>
          <tr><td>Confluence search</td><td>${st.confluence?.enabled ? "Enabled" : "Disabled"}</td></tr>
        </table>
        ${st.jira?.error ? `<p style="color:var(--danger);font-size:.8rem;margin-top:.5rem">Jira: ${st.jira.error}</p>` : ""}
        ${st.xray?.error ? `<p style="color:var(--danger);font-size:.8rem;margin-top:.25rem">XRay: ${st.xray.error}</p>` : ""}
        <div class="btn-row" style="margin-top:1rem">
          <button class="btn btn-outline btn-sm" data-action="test-jira">Test Jira</button>
          <button class="btn btn-outline btn-sm" data-action="test-xray">Test XRay</button>
          <button class="btn btn-accent btn-sm" data-action="sync-jira">Sync Ready for QA</button>
        </div>
      </div>
      <div class="card">
        <h3>Security</h3>
        <p style="font-size:.85rem;color:var(--muted);line-height:1.5">
          Credentials are stored locally in <code>app/config/credentials.json</code> (gitignored).
          Secrets are masked in the UI. Never commit API tokens to source control.
        </p>
        <p style="font-size:.8rem;margin-top:.75rem;color:var(--muted)">
          Jira token: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank">Atlassian API tokens</a><br>
          XRay keys: Jira → Apps → <strong>Xray</strong> → ⚙ Settings → <strong>API Keys</strong> → Create API Key
        </p>
        <details style="margin-top:.75rem;font-size:.8rem;color:var(--muted)">
          <summary style="cursor:pointer;color:var(--navy);font-weight:600">How to get XRay Client ID &amp; Secret</summary>
          <ol style="margin:.5rem 0 0 1rem;line-height:1.6">
            <li>Open <a href="https://vikingcloud.atlassian.net" target="_blank">vikingcloud.atlassian.net</a></li>
            <li>Click <strong>Apps</strong> (top nav) → open <strong>Xray Test Management</strong></li>
            <li>Go to <strong>Settings</strong> (gear icon) → <strong>API Keys</strong></li>
            <li>Click <strong>Create API Key</strong> — copy <strong>Client ID</strong> and <strong>Client Secret</strong></li>
            <li>Paste both into the form below and click <strong>Save Credentials</strong></li>
            <li>Click <strong>Test XRay</strong> to verify</li>
          </ol>
          <p style="margin-top:.5rem">If you don't see API Keys, ask your Jira admin to grant XRay API access.</p>
        </details>
      </div>
    </div>
    <div class="card">
      <h3>Credentials</h3>
      <form id="credentials-form">
        <div class="grid2">
          <div>
            <h4 style="font-size:.85rem;margin-bottom:.5rem;color:var(--navy)">Jira</h4>
            <div class="form-group"><label>Base URL</label><input name="jira.baseUrl" value="${c.jira?.baseUrl || "https://vikingcloud.atlassian.net"}" /></div>
            <div class="form-group"><label>Email</label><input name="jira.email" type="email" placeholder="you@vikingcloud.com" value="${(c.jira?.email || "").includes("***") ? "" : (c.jira?.email || "")}" /></div>
            <div class="form-group"><label>API Token</label><input name="jira.apiToken" type="password" placeholder="Paste token to save or replace" /></div>
            <div class="form-group"><label>Default Project</label><input name="jira.defaultProject" value="${c.jira?.defaultProject || "VCPCORE"}" /></div>
            <div class="form-group"><label>Ready for QA JQL</label><input name="jira.readyForQaJql" value="${c.jira?.readyForQaJql || 'project = VCPCORE AND status = \"Ready for QA\" ORDER BY updated DESC'}" />
              <small style="color:var(--muted);font-size:.7rem">Must include full status name in quotes, e.g. status = "Ready for QA"</small></div>
          </div>
          <div>
            <h4 style="font-size:.85rem;margin-bottom:.5rem;color:var(--navy)">XRay &amp; Confluence</h4>
            <div class="form-group"><label>XRay Client ID</label><input name="xray.clientId" type="password" placeholder="Paste to save" /></div>
            <div class="form-group"><label>XRay Client Secret</label><input name="xray.clientSecret" type="password" placeholder="Paste to save" /></div>
            <div class="form-group"><label>Confluence Spaces (comma-separated)</label><input name="confluence.defaultSpaces" value="${(c.confluence?.defaultSpaces || ["VC","CPE"]).join(", ")}" /></div>
            <div class="form-group"><label>GitHub Org / Repo</label>
              <div style="display:flex;gap:.5rem">
                <input name="github.org" placeholder="vikingcloud" value="${c.github?.org || ""}" style="flex:1" />
                <input name="github.repo" placeholder="qe-automation" value="${c.github?.repo || ""}" style="flex:1" />
              </div>
            </div>
          </div>
        </div>
        <div class="btn-row">
          <button type="submit" class="btn btn-primary">Save Credentials</button>
        </div>
      </form>
    </div>`;
}

function showNewStoryModal() {
  const overlay = el("div", "modal-overlay");
  overlay.innerHTML = `
    <div class="modal">
      <h2>New Jira Story</h2>
      <form id="new-story-form">
        <div class="form-group" id="jira-picker-group">
          <label>Select from Jira</label>
          <select name="jira_key" id="jira-story-select">
            <option value="">Loading Jira stories...</option>
          </select>
          <small id="jira-picker-hint" style="color:var(--muted);font-size:.7rem;display:block;margin-top:.25rem"></small>
        </div>
        <div class="form-group"><label>Jira Key</label><input name="key" id="story-key" readonly placeholder="Auto-filled from Jira" style="background:#f9fafb"/></div>
        <div class="form-group"><label>Title</label><input name="title" required placeholder="Story title"/></div>
        <div class="form-group"><label>Component</label><input name="component" placeholder="e.g. VCPCORE"/></div>
        <div class="form-group"><label>Programme</label><select name="programme" id="story-programme"><option>CVEP</option><option>JSIM</option><option>VCPCORE</option></select></div>
        <div class="form-group"><label>Priority</label><select name="priority" id="story-priority">
          <option>P1 — Deal Breaker</option><option selected>P2 — Critical</option><option>P3 — Highly Desirable</option><option>P4 — Nice to Have</option>
        </select></div>
        <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
        <div class="form-group"><label>Acceptance Criteria</label><textarea name="acceptance_criteria" placeholder="One per line"></textarea></div>
        <div class="form-group"><label>Definition of Done</label><textarea name="definition_of_done"></textarea></div>
        <div class="btn-row">
          <button type="submit" class="btn btn-primary">Import Story</button>
          <button type="button" class="btn btn-outline" data-close>Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const form = overlay.querySelector("#new-story-form");
  const select = overlay.querySelector("#jira-story-select");
  const hint = overlay.querySelector("#jira-picker-hint");
  const pickerGroup = overlay.querySelector("#jira-picker-group");

  overlay.querySelector("[data-close]").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  function setPriority(val) {
    const sel = overlay.querySelector("#story-priority");
    if (!sel || !val) return;
    for (const opt of sel.options) {
      if (opt.text === val || opt.text.startsWith(val.split(" ")[0])) {
        sel.value = opt.text;
        break;
      }
    }
  }

  function fillFromJira(issue) {
    overlay.querySelector("#story-key").value = issue.key || "";
    form.title.value = issue.title || "";
    form.component.value = issue.component || "";
    form.description.value = issue.description || "";
    form.acceptance_criteria.value = issue.acceptance_criteria || "";
    form.definition_of_done.value = issue.definition_of_done || "";
    if (issue.programme) {
      const prog = overlay.querySelector("#story-programme");
      for (const opt of prog.options) {
        if (opt.text === issue.programme) { prog.value = issue.programme; break; }
      }
    }
    setPriority(issue.priority);
  }

  select.onchange = async () => {
    const key = select.value;
    if (!key) {
      overlay.querySelector("#story-key").value = "";
      return;
    }
    hint.textContent = "Fetching details from Jira...";
    try {
      const issue = await Integrations.jiraIssue(key);
      fillFromJira(issue);
      hint.textContent = `Loaded ${key} from Jira (${issue.jira_status || "Ready for QA"})`;
    } catch (err) {
      hint.textContent = "Could not load issue: " + err.message;
    }
  };

  Integrations.jiraStories().then(({ connected, stories }) => {
    if (!connected) {
      select.innerHTML = `<option value="">Jira not configured — set up in Integrations</option>`;
      hint.textContent = "Go to Integrations and save your Jira credentials, then restart the app.";
      return;
    }
    if (!stories.length) {
      select.innerHTML = `<option value="">No Ready for QA stories found</option>`;
      hint.textContent = "Try Sync from Jira on the Stories page, or check your JQL in Integrations.";
      return;
    }
    select.innerHTML = `<option value="">— Choose a Jira story —</option>` +
      stories.map((s) =>
        `<option value="${s.key}" ${s.imported ? 'disabled' : ""}>${s.key} — ${s.title.slice(0, 60)}${s.title.length > 60 ? "…" : ""}${s.imported ? " (already imported)" : ""}</option>`
      ).join("");
    hint.textContent = `${stories.length} Ready for QA stories from Jira`;
  }).catch((err) => {
    select.innerHTML = `<option value="">Server needs restart — use RESTART-APP.bat</option>`;
    hint.textContent = err.message || "Could not load Jira stories. Restart the app to pick up latest code.";
    pickerGroup.querySelector("label").textContent = "Jira (restart required)";
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const jiraKey = data.jira_key || data.key;
    if (jiraKey) data.jira_key = jiraKey;
    delete data.key;
    try {
      const story = await Stories.create(data);
      overlay.remove();
      if (story._existing) {
        toast(`${story.key} already imported — opening existing`);
      } else {
        toast(`Imported ${story.key}`);
      }
      navigate("story", { id: story.id });
    } catch (err) { showToastError(err); }
  };
}

function bindViewEvents(view, params) {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.onclick = (e) => {
      if (btn.dataset.nav === "testcase" && btn.dataset.storyId && btn.dataset.tcId) {
        navigate("testcase", {
          storyId: parseInt(btn.dataset.storyId, 10),
          tcId: parseInt(btn.dataset.tcId, 10),
        });
        return;
      }
      const v = btn.dataset.nav;
      const navParams = {};
      if (btn.dataset.id) navParams.id = parseInt(btn.dataset.id, 10);
      if (btn.dataset.phase) navParams.phase = btn.dataset.phase;
      if (btn.dataset.filter) navParams.filter = btn.dataset.filter;
      if (btn.dataset.highlight) navParams.highlight = btn.dataset.highlight;
      navigate(v, navParams);
    };
  });
  document.querySelectorAll(".tc-card-click[data-nav]").forEach((card) => {
    card.onclick = () => {
      if (card.dataset.nav === "testcase" && card.dataset.storyId && card.dataset.tcId) {
        navigate("testcase", {
          storyId: parseInt(card.dataset.storyId, 10),
          tcId: parseInt(card.dataset.tcId, 10),
        });
        return;
      }
      const navParams = {};
      if (card.dataset.filter) navParams.filter = card.dataset.filter;
      if (card.dataset.highlight) navParams.highlight = card.dataset.highlight;
      if (card.dataset.id) navParams.id = parseInt(card.dataset.id, 10);
      navigate(card.dataset.nav, navParams);
    };
  });
  document.querySelectorAll("[data-action=new-story]").forEach((b) => {
    b.onclick = showNewStoryModal;
  });
  document.querySelectorAll("[data-action=advance]").forEach((b) => {
    b.onclick = async () => {
      try {
        await Stories.advance(parseInt(b.dataset.id, 10));
        toast("Agent completed — phase advanced");
        navigate("story", { id: parseInt(b.dataset.id, 10) });
      } catch (err) { showToastError(err); }
    };
  });
  document.querySelectorAll("[data-action=generate-tc]").forEach((b) => {
    b.onclick = async () => {
      try {
        const story = await Stories.generateTestCases(parseInt(b.dataset.id, 10));
        toast(`Generated ${story.test_cases?.length || 0} test cases`);
        navigate("story", { id: parseInt(b.dataset.id, 10) });
      } catch (err) { showToastError(err); }
    };
  });
  if (view === "testcases") {
    document.querySelectorAll("[data-action=save-tc]").forEach((btn) => {
      btn.onclick = () => saveTestCaseRow(btn.closest(".tc-edit-row"));
    });
    document.querySelectorAll(".tc-edit-row select[data-field]").forEach((sel) => {
      sel.onchange = () => saveTestCaseRow(sel.closest(".tc-edit-row"));
    });
    document.querySelectorAll('.tc-edit-row input[type="checkbox"][data-field]').forEach((cb) => {
      cb.onchange = () => saveTestCaseRow(cb.closest(".tc-edit-row"));
    });
  }
  if (view === "testcase" && params.storyId && params.tcId) {
    bindXrayStepRowEvents();
    document.querySelector("[data-action=add-step]")?.addEventListener("click", () => appendXrayStepRow());
    const form = document.getElementById("tc-editor-form");
    const reviewerSel = document.getElementById("tc-reviewer");
    if (reviewerSel) {
      const uploadBtn = document.querySelector("[data-action=upload-xray]");
      const syncUploadState = () => {
        const hasReviewer = !!reviewerSel.value;
        reviewerSel.classList.toggle("is-invalid", !hasReviewer && !reviewerSel.disabled);
        if (uploadBtn && !uploadBtn.textContent.includes("Published")) {
          uploadBtn.disabled = !hasReviewer;
        }
      };
      syncUploadState();
      reviewerSel.onchange = async () => {
        syncUploadState();
        if (!reviewerSel.value) return;
        await Catalog.updateTestCase(params.storyId, params.tcId, { reviewer: reviewerSel.value });
        toast("QA assignee saved");
      };
    }
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await saveTestCaseEditor(params.storyId, params.tcId);
          navigate("testcase", params);
        } catch (err) { showToastError(err); }
      };
    }
    document.querySelectorAll("[data-action=upload-xray]").forEach((btn) => {
      btn.onclick = async () => {
        const storyId = parseInt(btn.dataset.storyId, 10);
        const tcId = parseInt(btn.dataset.tcId, 10);
        const reviewer = document.getElementById("tc-reviewer")?.value;
        if (!reviewer) {
          showToastError(new Error("Assign a QA reviewer first"));
          return;
        }
        try {
          await saveTestCaseEditor(storyId, tcId);
          const result = await Catalog.uploadToXray(storyId, tcId);
          toast(result._already ? `Already in XRay: ${result.xray_key}` : `Uploaded to XRay: ${result.xray_key}`);
          navigate("testcase", { storyId, tcId });
        } catch (err) { showToastError(err); }
      };
    });
  }
  document.querySelectorAll("[data-action=approve]").forEach((b) => {
    b.onclick = async () => {
      try {
        await Stories.review(parseInt(b.dataset.id, 10), true, "Approved by " + state.role);
        toast("Test cases approved");
        navigate(view === "review" ? "review" : "story", { id: parseInt(b.dataset.id, 10) });
      } catch (err) { showToastError(err); }
    };
  });
  document.querySelectorAll("[data-action=reject]").forEach((b) => {
    b.onclick = async () => {
      const notes = prompt("Rejection reason:") || "Rework required";
      try {
        await Stories.review(parseInt(b.dataset.id, 10), false, notes);
        toast("Sent back to Test Design");
        navigate("story", { id: parseInt(b.dataset.id, 10) });
      } catch (err) { showToastError(err); }
    };
  });
  document.querySelectorAll("tbody tr[data-story-id]").forEach((row) => {
    row.onclick = () => navigate("story", { id: parseInt(row.dataset.storyId, 10) });
  });
  document.querySelectorAll("[data-action=sync-jira]").forEach((b) => {
    b.onclick = async () => {
      try {
        const r = await Integrations.syncJira();
        toast(`Jira sync: ${r.added} added, ${r.updated} updated (${r.total} fetched)`);
        navigate(view === "integrations" ? "integrations" : "stories");
      } catch (err) { showToastError(err); }
    };
  });
  document.querySelectorAll("[data-action=test-jira]").forEach((b) => {
    b.onclick = async () => {
      try {
        const r = await Integrations.testJira();
        toast(`Jira OK: ${r.user || "connected"}`);
        navigate("integrations");
      } catch (err) { showToastError(err); }
    };
  });
  document.querySelectorAll("[data-action=test-xray]").forEach((b) => {
    b.onclick = async () => {
      try {
        await Integrations.testXray();
        toast("XRay authenticated");
        navigate("integrations");
      } catch (err) { showToastError(err); }
    };
  });
  const credForm = document.getElementById("credentials-form");
  if (credForm) {
    credForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = { jira: {}, xray: {}, confluence: {}, github: {} };
      for (const [k, v] of fd.entries()) {
        if (!v) continue;
        const [section, field] = k.split(".");
        if (section === "confluence" && field === "defaultSpaces") {
          payload.confluence.defaultSpaces = v.split(",").map((s) => s.trim()).filter(Boolean);
        } else if (payload[section]) {
          payload[section][field] = v;
        }
      }
      try {
        await Integrations.saveCredentials(payload);
        toast("Credentials saved locally");
        navigate("integrations");
      } catch (err) { showToastError(err); }
    };
  }
  if (view === "defects" && params.highlight) {
    const row = document.querySelector(`.defect-row[data-defect-key="${CSS.escape(params.highlight)}"]`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  document.querySelectorAll(".escape-row").forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest("a, button")) return;
      const key = row.dataset.escapeKey;
      if (key) window.open(`https://vikingcloud.atlassian.net/browse/${key}`, "_blank", "noopener");
    };
  });
  if (view === "analysis" && params.filter) {
    const section = document.getElementById(`analysis-${params.filter}`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function init() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.onclick = (e) => {
      e.preventDefault();
      navigate(item.dataset.view);
    };
  });
  $("#role-select").value = state.role;
  $("#role-select").onchange = (e) => {
    state.role = e.target.value;
    localStorage.setItem("qe-role", state.role);
    toast("Role: " + state.role);
      navigate(document.querySelector(".nav-item.active")?.dataset.view || "vcprocess");
  };
  navigate("vcprocess");
}

async function bootstrap() {
  try {
    const res = await fetch("/api/auth/me");
    const me = await res.json();
    if (me.authRequired && !me.authenticated) {
      window.location.href = "/auth/login.html";
      return;
    }
    if (me.user) {
      const bar = $("#user-bar");
      const nameEl = $("#user-name");
      if (bar && nameEl) {
        nameEl.textContent = me.user.name || me.user.email;
        bar.hidden = false;
      }
    }
  } catch {
    /* local dev without auth */
  }
  init();
}

bootstrap();
