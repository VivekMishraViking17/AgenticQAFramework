const fs = require("fs");
const path = require("path");
const cxo = require("./cxo-briefing");

const BOARD_DEFECTS_FILE = path.join(__dirname, "..", "config", "board-defects.json");
const JIRA_BASE = "https://vikingcloud.atlassian.net/browse";

function loadBoardDefects() {
  if (!fs.existsSync(BOARD_DEFECTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BOARD_DEFECTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function defectsFromStories(stories) {
  return stories.flatMap((s) =>
    s.defects.map((d) => ({
      ...d,
      story_id: s.id,
      story_key: s.key,
      workstream: d.workstream || s.sprint_lane || s.component || "—",
      priority: d.priority || (d.severity === "High" ? "P1" : d.severity === "Medium" ? "P2" : "P3"),
      source: "platform",
      jira_url: `${JIRA_BASE}/${d.key}`,
    }))
  );
}

function listAllDefects(stories) {
  const platform = defectsFromStories(stories);
  const board = loadBoardDefects().map((d) => ({
    ...d,
    story_id: d.story_id || (d.story_key ? stories.find((s) => s.key === d.story_key)?.id : null),
    jira_url: `${JIRA_BASE}/${d.key}`,
    created_at: d.created_at || null,
  }));
  const seen = new Set();
  const merged = [];
  for (const d of [...platform, ...board]) {
    if (seen.has(d.key)) continue;
    seen.add(d.key);
    merged.push(d);
  }
  return merged.sort((a, b) => {
    const openA = a.status === "Open" ? 0 : 1;
    const openB = b.status === "Open" ? 0 : 1;
    if (openA !== openB) return openA - openB;
    return (a.key || "").localeCompare(b.key || "");
  });
}

function defectCounts(stories) {
  const all = listAllDefects(stories);
  const open = all.filter((d) => d.status === "Open" || d.status === "PO Review").length;
  const briefing = cxo.getBriefing().defectSummary;
  return {
    total_defects: Math.max(all.length, briefing.total),
    open_defects: Math.max(open, briefing.active),
    closed_defects: briefing.closed,
    p2_for_po: briefing.p2ForPo,
    board_active: briefing.active,
  };
}

module.exports = {
  JIRA_BASE,
  listAllDefects,
  defectCounts,
  loadBoardDefects,
};
