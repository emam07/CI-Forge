import type { Task } from "graphile-worker";
import { octokitForInstallation } from "@/lib/octokit";
import { JobNames, type BackfillPayload, type IngestRunPayload } from "@/lib/queue";

export const backfillTask: Task = async (rawPayload, helpers) => {
  const payload = rawPayload as BackfillPayload;
  const { installationId, repoFullName, sinceDays } = payload;
  const [owner, repoName] = repoFullName.split("/");
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const octokit = await octokitForInstallation(installationId);

  let enqueued = 0;
  for await (const response of octokit.paginate.iterator(
    "GET /repos/{owner}/{repo}/actions/runs",
    { owner, repo: repoName, created: `>=${since}`, per_page: 100 }
  )) {
    for (const run of response.data) {
      if (run.status !== "completed") continue;
      const ingestPayload: IngestRunPayload = {
        installationId,
        repoFullName,
        runId: run.id
      };
      await helpers.addJob(JobNames.IngestRun, ingestPayload, {
        jobKey: `run:${run.id}:${run.run_attempt ?? 1}`,
        maxAttempts: 5
      });
      enqueued++;
    }
  }

  helpers.logger.info(`backfill: enqueued ${enqueued} runs for ${repoFullName} (since ${since})`);
};
