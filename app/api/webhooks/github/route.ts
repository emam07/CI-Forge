import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";
import { env } from "@/lib/env";
import { getQueue, JobNames, type IngestRunPayload } from "@/lib/queue";
import { upsertInstallation, upsertRepo } from "@/lib/upsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhooks = new Webhooks({ secret: env.GITHUB_APP_WEBHOOK_SECRET });

function describeAccount(
  account: { login: string; type: string } | { slug: string } | null | undefined
): { login: string; type: string } {
  if (!account) return { login: "unknown", type: "User" };
  if ("login" in account) {
    return { login: account.login, type: account.type ?? "User" };
  }
  return { login: account.slug, type: "Enterprise" };
}

webhooks.on("installation.created", async ({ payload }) => {
  const account = describeAccount(payload.installation.account);
  await upsertInstallation({
    installationId: payload.installation.id,
    accountLogin: account.login,
    accountType: account.type
  });
  for (const repo of payload.repositories ?? []) {
    await upsertRepo({
      installationId: payload.installation.id,
      repo: { id: repo.id, full_name: repo.full_name, default_branch: null }
    });
  }
});

webhooks.on("installation_repositories.added", async ({ payload }) => {
  const account = describeAccount(payload.installation.account);
  await upsertInstallation({
    installationId: payload.installation.id,
    accountLogin: account.login,
    accountType: account.type
  });
  for (const repo of payload.repositories_added ?? []) {
    await upsertRepo({
      installationId: payload.installation.id,
      repo: { id: repo.id, full_name: repo.full_name, default_branch: null }
    });
  }
});

webhooks.on("workflow_run.completed", async ({ payload }) => {
  if (!payload.installation) return;
  await upsertRepo({
    installationId: payload.installation.id,
    repo: {
      id: payload.repository.id,
      full_name: payload.repository.full_name,
      default_branch: payload.repository.default_branch
    }
  });
  const queue = await getQueue();
  const job: IngestRunPayload = {
    installationId: payload.installation.id,
    repoFullName: payload.repository.full_name,
    runId: payload.workflow_run.id
  };
  await queue.addJob(JobNames.IngestRun, job, {
    jobKey: `run:${payload.workflow_run.id}:${payload.workflow_run.run_attempt ?? 1}`,
    maxAttempts: 5
  });
});

webhooks.onError((error) => {
  console.error("[webhook] handler error", error);
});

export async function POST(req: NextRequest) {
  const id = req.headers.get("x-github-delivery");
  const name = req.headers.get("x-github-event");
  const signature = req.headers.get("x-hub-signature-256");

  if (!id || !name || !signature) {
    return NextResponse.json({ error: "missing required headers" }, { status: 400 });
  }

  const body = await req.text();

  try {
    await webhooks.verifyAndReceive({
      id,
      name: name as Parameters<typeof webhooks.verifyAndReceive>[0]["name"],
      payload: body,
      signature
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] verify/receive failed", err);
    return NextResponse.json({ error: "invalid signature or handler error" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "ciforge-webhook" });
}
