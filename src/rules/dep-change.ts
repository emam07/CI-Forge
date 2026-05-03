import path from "node:path";
import type { Rule, RuleResult } from "./types";

const LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "Gemfile.lock",
  "composer.lock"
]);

export const depChangeRule: Rule = async (ctx) => {
  const hits = ctx.changedFiles.filter((f) => LOCKFILES.has(path.basename(f.filename)));
  if (hits.length === 0) return { matched: false, text: "" };

  const involvesInstall = ctx.job.jobName.match(/install|setup|build|test|ci/i);
  if (!involvesInstall) return { matched: false, text: "" };

  const lockfile = hits[0].filename;
  const result: RuleResult = {
    matched: true,
    text: `new/changed dep in \`${lockfile}\``,
    evidence: hits.map((h) => `${h.filename} (+${h.additions}/-${h.deletions})`).join(", "),
    confidence: 0.7
  };
  return result;
};
