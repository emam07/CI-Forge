import { formatDuration, formatPct, type RegressionResult, type JobDelta } from "./delta";
import type { CostLine } from "./cost";
import type { Observation } from "@/observations";
import { confidenceLabel, type RuleResult } from "@/rules/types";

const MARKER = "<!-- ciforge:pr-comment v1 -->";

export interface AttributedJob {
  job: JobDelta;
  causes: RuleResult[];
}

export interface CommentInput {
  result: RegressionResult;
  attributed: AttributedJob[];
  observations: Observation[];
  cost: CostLine | null;
  baselineBranch: string;
}

function jobLabel(j: JobDelta): string {
  const matrix = j.matrixKey ? ` \`(${j.matrixKey})\`` : "";
  return `\`${j.jobName}\`${matrix}`;
}

function workflowsCount(result: RegressionResult): number {
  return new Set(result.jobs.map((j) => j.workflowId.toString())).size;
}

function blockA(input: CommentInput): string {
  const { result, baselineBranch } = input;

  if (result.warming) {
    const target = result.baselineMinRuns;
    const have = result.baselineRunCount;
    if (!result.workflowHashKnown) {
      return `🟡 **CIForge calibrating** — first runs ingested. Headline alerts will start once we have ${target} successful runs on \`${baselineBranch}\` for the current workflow.`;
    }
    return `🟡 **CIForge calibrating** · ${have}/${target} baseline runs collected on \`${baselineBranch}\`. Headline alerts start once the baseline stabilizes — we don't quote a number we can't defend.`;
  }

  const window = `median of last ${result.baselineRunCount} runs`;
  const dur = formatDuration(result.totalDeltaS);
  const pct = formatPct(result.totalDeltaPct);

  if (!result.triggersAlert) {
    return `✅ **CI Δ within noise** (${dur}, ${pct}) vs \`${baselineBranch}\` baseline (${window})`;
  }

  const icon = result.totalDeltaS > 0 ? "⚠" : "🟢";
  return `${icon} **CI Δ ${dur} (${pct})** vs \`${baselineBranch}\` baseline (${window})`;
}

function renderCause(c: RuleResult, isPrimary: boolean): string {
  const conf = c.confidence ?? 0;
  const label = confidenceLabel(conf);
  const tag = c.ruleName === "fallback" ? "" : ` _(${label} confidence)_`;
  const prefix = isPrimary ? "likely cause" : "also possible";
  return `${prefix}: ${c.text}${tag}`;
}

function blockB(input: CommentInput): string {
  if (input.result.warming) return "";
  if (input.attributed.length === 0) {
    if (!input.result.triggersAlert) return "";
    return "_No individual jobs crossed the per-job significance threshold._";
  }
  const lines: string[] = [];
  for (const { job, causes } of input.attributed) {
    if (causes.length === 0) continue;
    const [primary, ...rest] = causes;
    lines.push(
      `- ${jobLabel(job)}: **${formatDuration(job.deltaS)}** — ${renderCause(primary, true)}`
    );
    for (const c of rest) {
      lines.push(`  - ${renderCause(c, false)}`);
    }
  }
  return lines.join("\n");
}

function blockC(input: CommentInput): string {
  if (input.observations.length === 0) return "";
  return input.observations.map((o) => `> ${o.text}`).join("\n");
}

function blockD(input: CommentInput): string {
  const c = input.cost;
  if (!c || !c.shouldRender) return "";
  const sign = input.result.totalDeltaS < 0 ? "-" : "+";
  const abs = Math.abs(c.monthlyDeltaUsd);
  const formatted = abs >= 1 ? `$${abs.toFixed(0)}` : `$${abs.toFixed(2)}`;
  return `_Estimated cost impact if merged: ${sign}${formatted}/mo at this repo's current push frequency._`;
}

export function renderComment(input: CommentInput): string {
  const parts: string[] = [MARKER];

  parts.push(blockA(input));

  const b = blockB(input);
  if (b) parts.push("", b);

  const c = blockC(input);
  if (c) parts.push("", c);

  const d = blockD(input);
  if (d) parts.push("", d);

  parts.push(
    "",
    `<sub>CIForge · ${workflowsCount(input.result)} workflow${workflowsCount(input.result) === 1 ? "" : "s"} · ` +
      `${input.result.jobs.length} job${input.result.jobs.length === 1 ? "" : "s"} compared</sub>`
  );

  return parts.join("\n");
}

export function isCiForgeComment(body: string | null | undefined): boolean {
  return !!body && body.includes(MARKER);
}

export const COMMENT_MARKER = MARKER;
