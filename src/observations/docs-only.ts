import type { Observer } from "./types";

const DOCS_PATTERNS = [
  /^docs\//i,
  /\.md$/i,
  /^README/i,
  /^CHANGELOG/i,
  /^LICENSE/i,
  /^\.github\/(ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE|FUNDING)/i
];

const HEAVY_HINT = /test|build|lint|deploy|integration|e2e/i;

export const docsOnlyObserver: Observer = (ctx) => {
  if (ctx.changedFiles.length === 0) return null;
  const allDocs = ctx.changedFiles.every((f) =>
    DOCS_PATTERNS.some((re) => re.test(f.filename))
  );
  if (!allDocs) return null;

  const heavyJob = ctx.prJobs.find((j) => HEAVY_HINT.test(j.jobName));
  if (!heavyJob) return null;

  return {
    code: "docs-only-trigger",
    text: `PR is docs-only but \`${heavyJob.workflowName}\` ran. Consider adding \`paths-ignore\` for \`*.md\`/\`docs/**\`.`
  };
};
