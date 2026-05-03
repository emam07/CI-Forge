import { describe, expect, it } from "vitest";
import { renderComment, type AttributedJob } from "./comment";
import type { RegressionResult, JobDelta } from "./delta";
import type { RuleResult } from "@/rules/types";

function baseResult(overrides: Partial<RegressionResult> = {}): RegressionResult {
  return {
    baselineBranch: "main",
    baselineRunCount: 0,
    baselineWindowSize: 20,
    baselineMinRuns: 20,
    warming: false,
    workflowHashKnown: true,
    prTotalS: 0,
    baselineTotalS: 0,
    totalDeltaS: 0,
    totalDeltaPct: 0,
    triggersAlert: false,
    jobs: [],
    topRegressions: [],
    ...overrides
  };
}

function jobDelta(over: Partial<JobDelta> = {}): JobDelta {
  return {
    workflowId: 1n,
    workflowName: "ci",
    jobName: "test",
    matrixKey: null,
    prDurationS: 200,
    baselineMedianS: 100,
    deltaS: 100,
    deltaPct: 1,
    significant: true,
    prRunnerLabel: null,
    baselineRunnerLabel: null,
    baselineCount: 20,
    ...over
  };
}

describe("renderComment", () => {
  it("renders calibrating state with progress when warming", () => {
    const out = renderComment({
      result: baseResult({ warming: true, baselineRunCount: 12, baselineMinRuns: 20 }),
      attributed: [],
      observations: [],
      cost: null,
      baselineBranch: "main"
    });
    expect(out).toContain("calibrating");
    expect(out).toContain("12/20");
  });

  it("renders calibrating with hash-unknown copy when no workflow hash yet", () => {
    const out = renderComment({
      result: baseResult({ warming: true, workflowHashKnown: false, baselineRunCount: 0 }),
      attributed: [],
      observations: [],
      cost: null,
      baselineBranch: "main"
    });
    expect(out).toContain("calibrating");
    expect(out).toContain("first runs");
  });

  it("renders multiple ranked causes with confidence labels", () => {
    const causes: RuleResult[] = [
      { matched: true, text: "matrix expanded: +2 combinations", confidence: 0.85, ruleName: "matrix-expansion" },
      { matched: true, text: "new/changed dep in `package-lock.json`", confidence: 0.7, ruleName: "dep-change" },
      { matched: true, text: "2 new test files added", confidence: 0.6, ruleName: "new-test-files" }
    ];
    const attributed: AttributedJob[] = [{ job: jobDelta(), causes }];
    const out = renderComment({
      result: baseResult({ triggersAlert: true, totalDeltaS: 90, totalDeltaPct: 0.5, baselineRunCount: 20 }),
      attributed,
      observations: [],
      cost: null,
      baselineBranch: "main"
    });
    expect(out).toContain("likely cause: matrix expanded");
    expect(out).toContain("(high confidence)");
    expect(out).toContain("also possible: new/changed dep");
    expect(out).toContain("(medium confidence)");
  });

  it("hides the confidence tag for the unknown fallback", () => {
    const out = renderComment({
      result: baseResult({ triggersAlert: true, totalDeltaS: 90, totalDeltaPct: 0.5, baselineRunCount: 20 }),
      attributed: [
        {
          job: jobDelta(),
          causes: [{ matched: true, text: "cause unknown — see run logs", confidence: 0, ruleName: "fallback" }]
        }
      ],
      observations: [],
      cost: null,
      baselineBranch: "main"
    });
    expect(out).toContain("cause unknown");
    expect(out).not.toContain("(low confidence)");
  });
});
