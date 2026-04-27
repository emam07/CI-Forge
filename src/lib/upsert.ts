import { db } from "./db";

type RepoLike = {
  id: number | bigint;
  full_name: string;
  default_branch?: string | null;
};

export async function upsertInstallation(payload: {
  installationId: number | bigint;
  accountLogin: string;
  accountType: string;
}) {
  return db.installation.upsert({
    where: { githubInstallationId: BigInt(payload.installationId) },
    create: {
      githubInstallationId: BigInt(payload.installationId),
      accountLogin: payload.accountLogin,
      accountType: payload.accountType
    },
    update: {
      accountLogin: payload.accountLogin,
      accountType: payload.accountType
    }
  });
}

export async function upsertRepo(opts: {
  installationId: number | bigint;
  repo: RepoLike;
}) {
  const installation = await db.installation.findUnique({
    where: { githubInstallationId: BigInt(opts.installationId) }
  });
  if (!installation) {
    throw new Error(
      `Installation ${opts.installationId} not found — webhook ordering issue.`
    );
  }
  return db.repo.upsert({
    where: { githubRepoId: BigInt(opts.repo.id) },
    create: {
      installationId: installation.id,
      githubRepoId: BigInt(opts.repo.id),
      fullName: opts.repo.full_name,
      defaultBranch: opts.repo.default_branch ?? "main"
    },
    update: {
      fullName: opts.repo.full_name,
      ...(opts.repo.default_branch ? { defaultBranch: opts.repo.default_branch } : {})
    }
  });
}
