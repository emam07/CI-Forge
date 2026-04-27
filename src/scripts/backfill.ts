/**
 * One-shot backfill for a single repo.
 *
 * Usage:
 *   tsx src/scripts/backfill.ts <installation_id> <owner/repo> [days]
 *
 * Enqueues a backfill job onto the queue. The worker must be running.
 */
import { getQueue, JobNames, type BackfillPayload } from "@/lib/queue";

async function main() {
  const [installationIdArg, repoFullName, daysArg] = process.argv.slice(2);
  if (!installationIdArg || !repoFullName) {
    console.error("Usage: tsx src/scripts/backfill.ts <installation_id> <owner/repo> [days]");
    process.exit(1);
  }
  if (!repoFullName.includes("/")) {
    console.error(`Invalid repo: ${repoFullName} (expected owner/repo)`);
    process.exit(1);
  }

  const installationId = Number(installationIdArg);
  if (!Number.isFinite(installationId)) {
    console.error(`Invalid installation_id: ${installationIdArg}`);
    process.exit(1);
  }

  const sinceDays = daysArg ? Number(daysArg) : 30;
  if (!Number.isFinite(sinceDays) || sinceDays < 1) {
    console.error(`Invalid days: ${daysArg}`);
    process.exit(1);
  }

  const queue = await getQueue();
  const payload: BackfillPayload = { installationId, repoFullName, sinceDays };
  await queue.addJob(JobNames.Backfill, payload, {
    jobKey: `backfill:${installationId}:${repoFullName}:${sinceDays}`,
    maxAttempts: 3
  });

  console.log(`Enqueued backfill: ${repoFullName} (last ${sinceDays}d, installation ${installationId})`);
  await queue.release();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
