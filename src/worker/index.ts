import { run } from "graphile-worker";
import { env } from "@/lib/env";
import { JobNames } from "@/lib/queue";
import { ingestRunTask } from "./jobs/ingest-run";
import { backfillTask } from "./jobs/backfill";
import { evaluatePrTask } from "./jobs/evaluate-pr";

async function main() {
  const runner = await run({
    connectionString: env.DATABASE_URL,
    concurrency: 4,
    pollInterval: 2000,
    taskList: {
      [JobNames.IngestRun]: ingestRunTask,
      [JobNames.Backfill]: backfillTask,
      [JobNames.EvaluatePr]: evaluatePrTask
    }
  });

  console.log("[worker] started — concurrency=4");

  await runner.promise;
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
