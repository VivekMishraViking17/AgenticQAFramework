const fs = require("fs");
const path = require("path");
const defectsCatalog = require("./defects-catalog");

const SEED_FILE = path.join(__dirname, "..", "config", "defect-analysis-seed.json");

const FISHBONE_CATEGORIES = [
  { id: "code", label: "Code / Implementation", causes: [] },
  { id: "requirements", label: "Requirements / AC gaps", causes: [] },
  { id: "environment", label: "Environment / Config", causes: [] },
  { id: "testdata", label: "Test Data / Merchant setup", causes: [] },
  { id: "integration", label: "Integration / API contract", causes: [] },
  { id: "process", label: "Process / Test coverage", causes: [] },
];

function loadSeed() {
  if (!fs.existsSync(SEED_FILE)) return { historical: {}, closed_samples: [], escapes: [], reopen_leaders: [] };
  try {
    return JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  } catch {
    return { historical: {}, closed_samples: [], escapes: [], reopen_leaders: [] };
  }
}

function inferRootCause(defect) {
  if (defect.root_cause) return defect.root_cause;
  const text = `${defect.title || ""} ${defect.labels || ""}`.toLowerCase();
  if (/locali|translation|fr-ca|string/.test(text)) return "Process";
  if (/auth|keycloak|session|password|activation/.test(text)) return "Environment";
  if (/api|mismatch|backend|contract|integration/.test(text)) return "Integration";
  if (/widget|label|missing|coverage|requirement|ac/.test(text)) return "Requirements";
  if (/data|merchant|YOURBANK|SAIR/.test(text)) return "Test Data";
  if (/focus|accessibility|ui|drawer|header|logo|mobile/.test(text)) return "Code";
  if (/checkout|payment|cancel|cart/.test(text)) return "Code";
  return "Code";
}

function isEscape(defect) {
  if (defect.escaped || defect.found_in === "Production" || defect.found_in === "UAT") return true;
  return /escaped|production|uat-escape|prod-bug/.test((defect.labels || "").toLowerCase());
}

function buildImpactedAreas(defects, seed) {
  const counts = {};
  for (const d of defects) {
    const area = d.workstream || d.component || "Other";
    counts[area] = (counts[area] || 0) + 1;
  }
  for (const s of seed.closed_samples || []) {
    counts[s.workstream] = (counts[s.workstream] || 0) + s.count;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .map(([area, count]) => ({
      area,
      count,
      pct: Math.round((count / total) * 1000) / 10,
      open: defects.filter((d) => (d.workstream || d.component) === area && (d.status === "Open" || d.status === "PO Review")).length,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildPareto(impactedAreas) {
  const total = impactedAreas.reduce((s, i) => s + i.count, 0) || 1;
  let cumulative = 0;
  return impactedAreas.map((item) => {
    cumulative += item.count;
    return {
      ...item,
      cumulative_pct: Math.round((cumulative / total) * 1000) / 10,
    };
  });
}

function buildFishbone(defects, seed) {
  const buckets = {};
  FISHBONE_CATEGORIES.forEach((c) => { buckets[c.label] = { count: 0, examples: [] }; });

  const mapCause = (cause) => {
    const m = {
      Code: "Code / Implementation",
      Requirements: "Requirements / AC gaps",
      Environment: "Environment / Config",
      "Test Data": "Test Data / Merchant setup",
      Integration: "Integration / API contract",
      Process: "Process / Test coverage",
      UX: "Code / Implementation",
    };
    return m[cause] || "Code / Implementation";
  };

  for (const d of defects) {
    const cat = mapCause(inferRootCause(d));
    buckets[cat].count += 1;
    if (buckets[cat].examples.length < 3) buckets[cat].examples.push(d.key);
  }
  for (const s of seed.closed_samples || []) {
    const cat = mapCause(s.root_cause);
    buckets[cat].count += s.count;
  }

  return FISHBONE_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: buckets[c.label]?.count || 0,
    examples: buckets[c.label]?.examples || [],
  })).sort((a, b) => b.count - a.count);
}

function buildEscapeMetrics(defects, seed) {
  const hist = seed.historical || {};
  const seedEscapes = seed.escapes || [];
  const liveEscapes = defects.filter(isEscape);
  const escaped = Math.max(hist.escaped_to_prod || 0, seedEscapes.filter((e) => e.found_in === "Production").length);
  const uatLeaks = seedEscapes.filter((e) => e.found_in === "UAT").length;
  const totalFound = hist.total_lifecycle || defects.length + (hist.closed || 0);
  const escapeRate = totalFound ? Math.round((escaped / totalFound) * 1000) / 10 : 0;
  const qaCatchRate = totalFound ? Math.round(((totalFound - escaped) / totalFound) * 1000) / 10 : 100;

  return {
    escaped_production: escaped,
    uat_leaks: uatLeaks,
    escape_rate_pct: escapeRate,
    qa_catch_rate_pct: qaCatchRate,
    target_escape_pct: 5,
    status: escapeRate <= 5 ? "green" : escapeRate <= 8 ? "amber" : "red",
    items: [...seedEscapes, ...liveEscapes.map((d) => ({
      key: d.key,
      title: d.title,
      workstream: d.workstream || d.component,
      severity: d.severity,
      found_in: d.found_in || "INT",
    }))].slice(0, 10),
  };
}

function buildReopenMetrics(seed) {
  const hist = seed.historical || {};
  const reopened = hist.qa_reopened || 0;
  const closed = hist.closed || 1;
  const rate = Math.round((reopened / closed) * 1000) / 10;
  return {
    qa_reopened_count: reopened,
    reopen_events: hist.qa_reopen_events || reopened,
    reopen_rate_pct: rate,
    target_reopen_pct: 15,
    status: rate <= 15 ? "green" : rate <= 20 ? "amber" : "red",
    by_workstream: seed.reopen_leaders || [],
  };
}

function buildTraceability(stories, defects) {
  const chains = [];
  let fullChain = 0;
  let partial = 0;
  let broken = 0;

  for (const story of stories) {
    const tcs = story.test_cases || [];
    const withXray = tcs.filter((t) => t.xray_key).length;
    const storyDefects = defects.filter((d) => d.story_id === story.id || d.story_key === story.key);
    const linkedDefects = storyDefects.filter((d) => d.linked_test || d.story_key).length;

    let chainStatus = "broken";
    if (story.key && tcs.length && withXray && (story.xray_published || withXray === tcs.length)) {
      chainStatus = linkedDefects || storyDefects.length ? "full" : "partial";
    } else if (story.key && tcs.length) {
      chainStatus = "partial";
    }

    if (chainStatus === "full") fullChain += 1;
    else if (chainStatus === "partial") partial += 1;
    else broken += 1;

    chains.push({
      story_key: story.key,
      title: story.title?.slice(0, 50) || "—",
      test_cases: tcs.length,
      xray_linked: withXray,
      defects: storyDefects.length,
      status: chainStatus,
      story_id: story.id,
    });
  }

  const defectLinks = defects.map((d) => ({
    key: d.key,
    story: d.story_key || "—",
    xray: d.linked_test || "—",
    complete: !!(d.story_key || d.story_id) && !!d.linked_test,
  }));

  const defectTracePct = defectLinks.length
    ? Math.round((defectLinks.filter((d) => d.complete).length / defectLinks.length) * 1000) / 10
    : 0;

  const storyTracePct = stories.length
    ? Math.round((fullChain / stories.length) * 1000) / 10
    : 0;

  return {
    story_full_chain: fullChain,
    story_partial: partial,
    story_broken: broken,
    story_trace_pct: storyTracePct,
    defect_trace_pct: defectTracePct,
    target_pct: 100,
    chains: chains.slice(0, 12),
    defect_links: defectLinks.slice(0, 15),
  };
}

function buildAnalysis(stories) {
  const seed = loadSeed();
  const defects = defectsCatalog.listAllDefects(stories);
  const impactedAreas = buildImpactedAreas(defects, seed);
  const pareto = buildPareto(impactedAreas);
  const pareto80Index = pareto.findIndex((p) => p.cumulative_pct >= 80);
  const escapes = buildEscapeMetrics(defects, seed);
  const reopens = buildReopenMetrics(seed);
  const fishbone = buildFishbone(defects, seed);
  const traceability = buildTraceability(stories, defects);

  return {
    period: seed.period || "Last 90 days",
    summary: {
      total_defects: seed.historical?.total_lifecycle || defects.length,
      open_defects: defects.filter((d) => d.status === "Open" || d.status === "PO Review").length,
      escape_rate_pct: escapes.escape_rate_pct,
      reopen_rate_pct: reopens.reopen_rate_pct,
      traceability_pct: traceability.defect_trace_pct,
      top_impacted_area: impactedAreas[0]?.area || "—",
    },
    escape_defects: escapes,
    qa_reopen: reopens,
    impacted_areas: impactedAreas,
    pareto: {
      items: pareto,
      eighty_twenty_cutoff: pareto80Index >= 0 ? pareto.slice(0, pareto80Index + 1).map((p) => p.area) : [],
      insight: pareto[0]
        ? `Top ${pareto80Index + 1 || 3} workstreams account for ${pareto[Math.min(pareto80Index, pareto.length - 1)]?.cumulative_pct || 80}% of defects — prioritize ${pareto.slice(0, 2).map((p) => p.area).join(" & ")}.`
        : "Insufficient data for Pareto insight.",
    },
    fishbone: {
      categories: fishbone,
      insight: fishbone[0]
        ? `Primary root-cause bucket: ${fishbone[0].label} (${fishbone[0].count} defects). Address ${fishbone[0].label.toLowerCase()} in sprint planning.`
        : "",
    },
    traceability,
  };
}

module.exports = { buildAnalysis, inferRootCause };
