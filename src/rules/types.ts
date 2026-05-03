import type { JobDelta } from "@/lib/delta";
import type { WorkflowBaseline } from "@/lib/baseline";
import type { InstallationOctokit } from "@/lib/octokit";

export interface ChangedFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PrSnapshot {
  workflowId: bigint;
  workflowName: string;
  headBranch: string | null;
  jobs: PrJobSnapshot[];
}

export interface PrJobSnapshot {
  workflowId: bigint;
  workflowName: string;
  jobName: string;
  matrixKey: string | null;
  durationS: number | null;
  runnerLabel: string | null;
  steps: { name: string; durationS: number | null }[];
}

export interface RuleContext {
  octokit: InstallationOctokit;
  owner: string;
  repo: string;
  prNumber: number;
  job: JobDelta;
  prJobs: PrJobSnapshot[];
  baselines: WorkflowBaseline[];
  changedFiles: ChangedFile[];
}

export interface RuleResult {
  matched: boolean;
  text: string;
  evidence?: string;
  confidence?: number;
  ruleName?: string;
}

export type Rule = (ctx: RuleContext) => Promise<RuleResult>;

export const NoMatch: RuleResult = { matched: false, text: "" };

export function confidenceLabel(c: number): "high" | "medium" | "low" {
  if (c >= 0.8) return "high";
  if (c >= 0.55) return "medium";
  return "low";
}

export function rootJobName(name: string): string {
  const idx = name.indexOf(" (");
  return idx === -1 ? name : name.slice(0, idx);
}
