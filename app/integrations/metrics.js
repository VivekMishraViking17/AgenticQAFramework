/** Real-time ROI and token usage calculations for dashboard KPIs */

const DEFAULT_TOKEN_BUDGET = 2_000_000; // tokens per calendar month
const QE_HOURLY_USD = 75;
const MANUAL_TC_MINUTES = 45;
const AGENT_TC_BATCH_MINUTES = 12; // ~12 min for 8 TCs with agent vs 6h manual
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 12.0;
const PLATFORM_MONTHLY_USD = 640; // amortized Cursor/agent platform seats (16 QE FTE)

const PHASE_TOKEN_ESTIMATES = {
  intake: { input: 2800, output: 900 },
  knowledge: { input: 6200, output: 1800 },
  design: { input: 4800, output: 3200 },
  review: { input: 3600, output: 1200 },
  xray: { input: 2200, output: 800 },
  auto_plan: { input: 3000, output: 1100 },
  codegen: { input: 8400, output: 4200 },
  execute: { input: 5200, output: 1600 },
};

const PHASE_LABOR_SAVED_MINUTES = {
  intake: 35,
  knowledge: 55,
  design: 0, // counted per test case instead
  review: 25,
  xray: 40,
  auto_plan: 30,
  codegen: 120,
  execute: 45,
};

function monthStartIso(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function ensureMetrics(data) {
  if (!data.metrics) {
    data.metrics = {
      tokenBudgetMonthly: DEFAULT_TOKEN_BUDGET,
      tokenPeriodStart: monthStartIso(),
    };
  }
  const periodStart = new Date(data.metrics.tokenPeriodStart);
  const now = new Date();
  if (periodStart.getMonth() !== now.getMonth() || periodStart.getFullYear() !== now.getFullYear()) {
    data.metrics.tokenPeriodStart = monthStartIso(now);
  }
  if (!data.metrics.tokenBudgetMonthly) data.metrics.tokenBudgetMonthly = DEFAULT_TOKEN_BUDGET;
  return data.metrics;
}

function estimateTokensForRun(phase, story) {
  const base = PHASE_TOKEN_ESTIMATES[phase] || { input: 2500, output: 900 };
  const acLines = (story?.acceptance_criteria || "").split("\n").filter(Boolean).length;
  const tcCount = story?.test_cases?.length || 0;
  const input = base.input + acLines * 120 + tcCount * 40;
  const output = base.output + Math.min(tcCount, 8) * 180;
  return { input, output, total: input + output };
}

function tokensForRun(run, story) {
  if (run.tokens_total) {
    return {
      input: run.tokens_input || 0,
      output: run.tokens_output || 0,
      total: run.tokens_total,
    };
  }
  return estimateTokensForRun(run.phase, story);
}

function laborSavedUsd(story) {
  let minutes = 0;
  for (const run of story.agent_runs || []) {
    if (run.phase === "design") {
      const tcCount = story.test_cases?.length || 8;
      minutes += tcCount * MANUAL_TC_MINUTES - AGENT_TC_BATCH_MINUTES;
    } else {
      minutes += PHASE_LABOR_SAVED_MINUTES[run.phase] || 20;
    }
  }
  return (minutes / 60) * QE_HOURLY_USD;
}

function aiCostUsd(inputTokens, outputTokens) {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
}

function aggregateUsage(data) {
  const metrics = ensureMetrics(data);
  const periodStart = new Date(metrics.tokenPeriodStart).getTime();
  let tokensInput = 0;
  let tokensOutput = 0;
  let tokensTotal = 0;
  let runsInPeriod = 0;
  let laborSaved = 0;
  let aiCost = 0;

  for (const story of data.stories || []) {
    laborSaved += laborSavedUsd(story);
    for (const run of story.agent_runs || []) {
      const runTs = new Date(run.created_at).getTime();
      if (runTs < periodStart) continue;
      runsInPeriod += 1;
      const t = tokensForRun(run, story);
      tokensInput += t.input;
      tokensOutput += t.output;
      tokensTotal += t.total;
      aiCost += aiCostUsd(t.input, t.output);
    }
  }

  const tokenLimit = metrics.tokenBudgetMonthly;
  const tokensPct = tokenLimit ? Math.round((tokensTotal / tokenLimit) * 1000) / 10 : 0;
  const tokensRemaining = Math.max(0, tokenLimit - tokensTotal);
  const tokensExhausted = tokensTotal >= tokenLimit;
  const totalAiCost = aiCost + PLATFORM_MONTHLY_USD;
  const roiMultiple = totalAiCost > 0
    ? Math.round((laborSaved / totalAiCost) * 10) / 10
    : laborSaved > 0 ? 99.9 : 0;

  return {
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    tokens_used: tokensTotal,
    tokens_limit: tokenLimit,
    tokens_remaining: tokensRemaining,
    tokens_pct: tokensPct,
    tokens_exhausted: tokensExhausted,
    labor_savings_usd: Math.round(laborSaved),
    ai_cost_usd: Math.round(aiCost * 100) / 100,
    platform_cost_usd: PLATFORM_MONTHLY_USD,
    total_cost_usd: Math.round((totalAiCost) * 100) / 100,
    roi_multiple: Math.min(99.9, roiMultiple),
    agent_runs_in_period: runsInPeriod,
    token_period_start: metrics.tokenPeriodStart,
  };
}

function buildAgentRunTokens(phase, story) {
  const t = estimateTokensForRun(phase, story);
  return {
    tokens_input: t.input,
    tokens_output: t.output,
    tokens_total: t.total,
  };
}

module.exports = {
  DEFAULT_TOKEN_BUDGET,
  ensureMetrics,
  estimateTokensForRun,
  aggregateUsage,
  buildAgentRunTokens,
};
