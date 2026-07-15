/** VCPCORE Board 154 QA Health — CXO briefing (14 July 2026 reference deck) */

const BRIEFING = {
  meta: {
    title: "VCPCORE Board 154 · QA Health Briefing",
    board: "154",
    date: "14 July 2026",
    programme: "CVEP / JSIM",
    environment: "asgard-int.vikingcloud.com",
    testSet: "XR-16269",
  },
  headline: "Core CVEP workstreams validated — checkout and JSIM header remain the delivery risks.",
  cxoRead:
    "UI, insurance, scam, and JSIM core are healthy. Focus investment on checkout flows and JSIM standalone this sprint.",
  release: {
    status: "conditional",
    statusLabel: "Conditional Go",
    summary: "Release candidate viable for core paths; checkout + JSIM header block milestone #7 exit.",
    targetGate: "Milestone #7 — QA Critical Path",
    owner: "Director QE",
  },
  kpis: [
    { id: "pass-rate", label: "Core pass rate", value: "84%", detail: "481 of 571 tests", status: "green" },
    { id: "bug-closure", label: "Bug closure", value: "90%", detail: "208 of 231 closed", status: "green" },
    { id: "executed", label: "Tests executed", value: "87%", detail: "560 of 642 run", status: "green" },
    { id: "active-defects", label: "Active defects", value: "23", detail: "Plus 6 P2 for PO", status: "amber" },
    { id: "checkout", label: "Checkout pass", value: "44%", detail: "24 tests still TODO", status: "red" },
    { id: "jsim-header", label: "JSIM header", value: "11%", detail: "Suite not started", status: "red" },
  ],
  workstreams: [
    { name: "VCP UI Redesign", pass: "87%", status: "On track", statusTone: "green", risk: "Security Score & onboarding still in QA" },
    { name: "JSIM 3 Pillars", pass: "85%", status: "On track", statusTone: "green", risk: "Malware count accuracy under validation" },
    { name: "Scamnetic", pass: "84%", status: "On track", statusTone: "green", risk: "Localization suite not started (9 TODO)" },
    { name: "Insurance", pass: "76%", status: "Watch", statusTone: "amber", risk: "P2: Card Testing $5K missing on widget" },
    { name: "Auth0 / Keycloak", pass: "—", status: "Watch", statusTone: "amber", risk: "Merchant activation & password-reset blockers" },
    { name: "Marketplace checkout", pass: "44%", status: "At risk", statusTone: "red", risk: "Cancel/success behaviour + 24 TODO tests" },
    { name: "JSIM header / standalone", pass: "11%", status: "At risk", statusTone: "red", risk: "Near-zero coverage; 4 bugs in PO review" },
  ],
  defectInsight: "Nearly half of active bugs (11 of 23) sit in UI Redesign. Six P2 items need product decisions this week.",
  actions: [
    "Prioritize marketplace checkout E2E — 24 tests TODO, 44% pass.",
    "Stand up JSIM header suite — currently 11% with 4 bugs in PO review.",
    "Clear 6 P2 defects awaiting PO decision before sprint close.",
    "Maintain XR-16269 critical path green for milestone #7 gate.",
  ],
  defectSummary: {
    active: 23,
    p2ForPo: 6,
    closed: 208,
    total: 231,
    closurePct: 90,
    uiRedesignShare: 11,
  },
};

function getBriefing() {
  return BRIEFING;
}

function getReleaseStatus() {
  const b = BRIEFING;
  const redCount = b.workstreams.filter((w) => w.statusTone === "red").length;
  return {
    ...b.release,
    passRate: b.kpis.find((k) => k.id === "pass-rate")?.value,
    activeDefects: b.defectSummary.active,
    atRiskStreams: redCount,
    headline: b.headline,
  };
}

module.exports = { getBriefing, getReleaseStatus, BRIEFING };
