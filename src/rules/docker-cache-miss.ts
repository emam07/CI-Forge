import type { Rule, RuleResult } from "./types";

const DOCKER_FILE = /(^|\/)Dockerfile(\..+)?$/i;

function firstChangedLineFromPatch(patch: string | undefined): number | null {
  if (!patch) return null;
  const m = patch.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/m);
  return m ? parseInt(m[2], 10) : null;
}

export const dockerCacheMissRule: Rule = async (ctx) => {
  const dockerFiles = ctx.changedFiles.filter((f) => DOCKER_FILE.test(f.filename));
  if (dockerFiles.length === 0) return { matched: false, text: "" };

  const looksLikeBuildJob = /docker|image|build|publish|container/i.test(ctx.job.jobName);
  if (!looksLikeBuildJob) return { matched: false, text: "" };
  if (ctx.job.deltaS < 30) return { matched: false, text: "" };

  const dockerfile = dockerFiles[0];
  const lineN = firstChangedLineFromPatch(dockerfile.patch);
  const where = lineN ? `at line ${lineN} of \`${dockerfile.filename}\`` : `in \`${dockerfile.filename}\``;

  const result: RuleResult = {
    matched: true,
    text: `cache miss ${where}`,
    evidence: `${dockerfile.filename} +${dockerfile.additions}/-${dockerfile.deletions}`,
    confidence: 0.65
  };
  return result;
};
