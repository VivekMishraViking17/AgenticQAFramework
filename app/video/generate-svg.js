/**
 * Generate enterprise SVG slides for CXO video (1920x1080)
 */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "svg");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const NAVY = "#1d3c83";
const NAVY_D = "#0a1628";
const CYAN = "#66fcf9";
const GREEN = "#8ea523";
const AMBER = "#d97706";
const RED = "#cc2415";
const MUTED = "#64748b";

function wrap(text, x, y, size, weight = 600, fill = "#fff", anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(text)}</text>`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slide(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="hero" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${NAVY_D}"/>
      <stop offset="50%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#23569a"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="#f4f6f9"/>
  ${body}
  <text x="64" y="1050" fill="${MUTED}" font-family="Segoe UI" font-size="13">VikingCloud · VCPCORE Board 154 · Agentic QE Platform</text>
</svg>`;
}

function hero(y, eyebrow, title, subtitle = "") {
  let s = `<rect width="1920" height="320" fill="url(#hero)"/>
  ${wrap(eyebrow, 64, 72, 14, 600, CYAN)}
  ${wrap(title, 64, 130, 42, 700)}
  ${subtitle ? wrap(subtitle, 64, 175, 20, 400, "rgba(255,255,255,0.88)") : ""}`;
  return s;
}

function kpi(x, y, val, lbl, sub, color = GREEN) {
  return `<rect x="${x}" y="${y}" width="420" height="140" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="${x}" y="${y}" width="420" height="6" rx="3" fill="${color}"/>
  ${wrap(val, x + 24, y + 62, 44, 700, NAVY)}
  ${wrap(lbl, x + 24, y + 92, 13, 600, MUTED)}
  ${wrap(sub, x + 24, y + 118, 12, 400, "#94a3b8")}`;
}

const slides = {
  "01-title": slide(`
    <rect width="1920" height="1080" fill="url(#hero)"/>
    ${wrap("VIKINGCLOUD", 960, 380, 22, 600, CYAN, "middle")}
    ${wrap("Agentic QE Platform", 960, 480, 56, 700, "#fff", "middle")}
    ${wrap("VCPCORE Board 154 — CXO End-to-End Quality Briefing", 960, 560, 24, 400, "rgba(255,255,255,0.85)", "middle")}
    ${wrap("14 July 2026 · Quality Engineering · asgard-int.vikingcloud.com", 960, 640, 16, 400, "rgba(255,255,255,0.55)", "middle")}
  `),

  "02-e2e": slide(`
    ${hero(0, "VIKINGCLOUD · VCPCORE · BOARD 154", "End-to-End Quality Process", "Nine agentic stages — Dev handoff to defect closure")}
    ${["00 Handoff", "01 Intake", "02 Knowledge", "03 Design", "04 Review", "05 XRay", "06 Auto", "07 Code", "08 Execute"].map((l, i) => {
      const x = 120 + i * 190;
      const active = i === 8;
      const done = i < 5;
      const fill = active ? NAVY : done ? GREEN : "#cbd5e1";
      return `<rect x="${x}" y="400" width="160" height="100" rx="10" fill="#fff" stroke="${active ? NAVY : done ? GREEN : "#cbd5e1"}" stroke-width="2"/>
      <circle cx="${x + 80}" cy="430" r="16" fill="${fill}"/>
      ${wrap(l.split(" ")[0], x + 80, 470, 11, 600, "#1a2744", "middle")}
      ${wrap(l.split(" ")[1] || "", x + 80, 488, 10, 400, MUTED, "middle")}`;
    }).join("")}
    ${wrap("Programme: Milestones #1–#12 · CVEP/JSIM · CXO gates", 960, 580, 16, 400, MUTED, "middle")}
  `),

  "03-stages-ab": slide(`
    ${hero(0, "STAGES 00 – 04", "Prepare & Validate Test Assets", "Human gates at intake, SME validation, and mandatory QA review")}
    <rect x="64" y="360" width="840" height="280" rx="12" fill="#fff8e6" stroke="#fde68a"/>
    ${wrap("INPUTS", 88, 400, 12, 700, "#92400e")}
    ${wrap("• Story in Jira with AC + DoD", 88, 440, 16, 400, "#1a2744")}
    ${wrap("• Code merged, deployed to asgard-int", 88, 475, 16, 400, "#1a2744")}
    ${wrap("• Confluence PRD + escaped defects JQL", 88, 510, 16, 400, "#1a2744")}
    ${wrap("→", 960, 510, 48, 700, NAVY, "middle")}
    <rect x="1016" y="360" width="840" height="280" rx="12" fill="#ecfdf5" stroke="#a7f3d0"/>
    ${wrap("OUTPUTS", 1040, 400, 12, 700, "#065f46")}
    ${wrap("• Structured requirement model", 1040, 440, 16, 400, "#1a2744")}
    ${wrap("• RAG context bundle with citations", 1040, 475, 16, 400, "#1a2744")}
    ${wrap("• 8 labeled test cases + QA approved set", 1040, 510, 16, 400, "#1a2744")}
    ${wrap("Gate 3 — QA SME Review is MANDATORY before XRay publish", 960, 720, 18, 600, NAVY, "middle")}
  `),

  "04-stages-cd": slide(`
    ${hero(0, "STAGES 05 – 08", "Publish, Automate & Execute on INT", "XRay publication through CI execution and defect routing")}
    ${kpi(64, 380, "100%", "XRay traceability", "Approved TCs linked to Jira", GREEN)}
    ${kpi(520, 380, "≥70%", "Automation candidates", "P1/P2 flagged for codegen", GREEN)}
    ${kpi(976, 380, "≥85%", "First-pass PR approval", "SDET code review gate", GREEN)}
    ${kpi(1432, 380, "0", "Open P1/P2 at exit", "Milestone #7 requirement", AMBER)}
    ${wrap("Outputs: XRay tests linked · Playwright PR · CI on asgard-int · Defects → PO Review", 960, 580, 18, 400, MUTED, "middle")}
  `),

  "05-cxo-kpi": slide(`
    ${hero(0, "CXO READOUT · 14 JULY 2026", "Programme Health at a Glance", "Core CVEP workstreams validated — checkout and JSIM header are delivery risks")}
    ${kpi(64, 360, "84%", "Core pass rate", "481 of 571 tests", GREEN)}
    ${kpi(520, 360, "90%", "Bug closure", "208 of 231 closed", GREEN)}
    ${kpi(976, 360, "87%", "Tests executed", "560 of 642 run", GREEN)}
    ${kpi(1432, 360, "23", "Active defects", "Plus 6 P2 for PO", AMBER)}
    <rect x="64" y="540" width="1792" height="100" rx="12" fill="#fff" stroke="${AMBER}" stroke-width="3"/>
    ${wrap("Release Decision: Conditional Go — checkout + JSIM header block Milestone #7 (Director QE)", 88, 600, 20, 600, NAVY)}
  `),

  "06-cxo-risk": slide(`
    ${hero(0, "WORKSTREAM SCORECARD", "Pass Rate, Status & Top Risk", "UI, insurance, scam, JSIM core healthy — focus checkout and JSIM standalone")}
    ${[
      ["VCP UI Redesign", "87%", "On track", GREEN, "Security Score in QA"],
      ["JSIM 3 Pillars", "85%", "On track", GREEN, "Malware count validation"],
      ["Marketplace checkout", "44%", "At risk", RED, "24 TODO tests remaining"],
      ["JSIM header / standalone", "11%", "At risk", RED, "4 bugs in PO review"],
    ].map((r, i) => {
      const y = 360 + i * 72;
      return `<rect x="64" y="${y}" width="1792" height="60" rx="8" fill="#fff" stroke="#e2e8f0"/>
      ${wrap(r[0], 88, y + 38, 16, 600, "#1a2744")}
      ${wrap(r[1], 520, y + 38, 16, 700, NAVY)}
      <rect x="620" y="${y + 18}" width="90" height="28" rx="14" fill="${r[3]}22"/>
      ${wrap(r[2], 665, y + 38, 12, 700, r[3], "middle")}
      ${wrap(r[4], 760, y + 38, 14, 400, MUTED)}`;
    }).join("")}
  `),

  "07-analysis": slide(`
    ${hero(0, "DEFECT ANALYSIS", "Escape Rate, Pareto & Traceability", "Board 154 — last 90 days")}
    ${kpi(64, 340, "3%", "Escape rate", "Target ≤ 5% · 7 prod escapes", GREEN)}
    ${kpi(520, 340, "14.9%", "QA reopen rate", "31 of 208 closed", GREEN)}
    ${kpi(976, 340, "UI", "Top impacted area", "VCP UI Redesign", AMBER)}
    ${kpi(1432, 340, "100%", "E2E traceability", "Story → XRay → Defect", GREEN)}
    ${wrap("Pareto: UI Redesign + Checkout = 80% of defect volume", 960, 560, 20, 600, NAVY, "middle")}
    ${[["VCP UI Redesign", 87], ["JSIM 3 Pillars", 62], ["Marketplace checkout", 33]].map(([l, w], i) => {
      const y = 620 + i * 50;
      return `${wrap(l, 400, y + 20, 14, 400, MUTED, "end")}
      <rect x="420" y="${y}" width="900" height="24" rx="4" fill="#e2e8f0"/>
      <rect x="420" y="${y}" width="${w * 9}" height="24" rx="4" fill="${NAVY}"/>`;
    }).join("")}
  `),

  "08-milestones": slide(`
    ${hero(0, "PROGRAMME MILESTONE ANCHORS", "CXO Gates Across the Lifecycle", "M#1 Engineering Smoke · M#7 QA Critical Path · M#12 UAT Kickoff")}
    ${[
      ["#1", "Engineering Smoke", "INT stable — blocks all QA", GREEN, "GREEN"],
      ["#7", "QA Critical Path", "XR-16269 · Checkout + JSIM must green", CYAN, "IN PROGRESS"],
      ["#12", "UAT Kickoff", "Production dummy-merchant UAT", MUTED, "PLANNED"],
    ].map((m, i) => {
      const x = 120 + i * 580;
      return `<rect x="${x}" y="400" width="520" height="220" rx="12" fill="#fff" stroke="${i === 1 ? CYAN : "#e2e8f0"}" stroke-width="${i === 1 ? 3 : 1}"/>
      <rect x="${x + 180}" y="430" width="160" height="32" rx="6" fill="${NAVY}"/>
      ${wrap("MILESTONE " + m[0], x + 260, 452, 12, 700, "#fff", "middle")}
      ${wrap(m[1], x + 260, 500, 20, 700, "#1a2744", "middle")}
      ${wrap(m[2], x + 260, 540, 14, 400, MUTED, "middle")}
      ${wrap(m[4], x + 260, 590, 13, 700, m[3], "middle")}`;
    }).join("")}
  `),

  "09-close": slide(`
    <rect width="1920" height="1080" fill="url(#hero)"/>
    ${wrap("VIKINGCLOUD", 960, 400, 22, 600, CYAN, "middle")}
    ${wrap("Traceable · Measurable · Board-Ready", 960, 500, 48, 700, "#fff", "middle")}
    ${wrap("Agentic QE Platform — end-to-end quality from Dev handoff to CXO gates", 960, 580, 22, 400, "rgba(255,255,255,0.85)", "middle")}
  `),
};

for (const [id, svg] of Object.entries(slides)) {
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg, "utf8");
  console.log("Wrote", id);
}
