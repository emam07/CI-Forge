import { makeWorkerUtils, type WorkerUtils } from "graphile-worker";
import { env } from "./env";

let utilsPromise: Promise<WorkerUtils> | null = null;

export function getQueue(): Promise<WorkerUtils> {
  if (!utilsPromise) {
    utilsPromise = makeWorkerUtils({ connectionString: env.DATABASE_URL });
  }
  return utilsPromise;
}

export const JobNames = {
  IngestRun: "ingest-run",
  Backfill: "backfill-repo",
  EvaluatePr: "evaluate-pr"
} as const;

export type IngestRunPayload = {
  installationId: number;
  repoFullName: string;
  runId: number;
};

export type BackfillPayload = {
  installationId: number;
  repoFullName: string;
  sinceDays: number;
};

export type EvaluatePrPayload = {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  headSha: string;
};
