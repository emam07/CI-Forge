import type { Observer } from "./types";

const MAC_RUNNER = /^macos-/i;
const UBUNTU_RUNNER = /^ubuntu-/i;
const PLATFORM_SPECIFIC_STEP = /xcodebuild|fastlane|pod\b|swift\b|swiftc|brew\b|otool|codesign/i;

export const runnerMismatchObserver: Observer = (ctx) => {
  // Group jobs by workflow
  const byWorkflow = new Map<string, typeof ctx.prJobs>();
  for (const job of ctx.prJobs) {
    const k = job.workflowId.toString();
    const arr = byWorkflow.get(k) ?? [];
    arr.push(job);
    byWorkflow.set(k, arr);
  }

  for (const jobs of byWorkflow.values()) {
    const hasMac = jobs.some((j) => j.runnerLabel && MAC_RUNNER.test(j.runnerLabel));
    const hasUbuntu = jobs.some((j) => j.runnerLabel && UBUNTU_RUNNER.test(j.runnerLabel));
    if (!hasMac || !hasUbuntu) continue;

    const macJobs = jobs.filter((j) => j.runnerLabel && MAC_RUNNER.test(j.runnerLabel));
    const macJobIsPlatformAgnostic = macJobs.every((j) =>
      j.steps.every((s) => !PLATFORM_SPECIFIC_STEP.test(s.name))
    );
    if (!macJobIsPlatformAgnostic) continue;

    const macJobNames = macJobs.map((j) => j.jobName).join(", ");
    return {
      code: "runner-mismatch",
      text: `\`${macJobNames}\` runs on macOS but no platform-specific steps detected. Switching to \`ubuntu-latest\` is ~10× cheaper per minute.`
    };
  }

  return null;
};
