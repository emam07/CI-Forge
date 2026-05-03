import { db } from "./db";
import type { InstallationOctokit } from "./octokit";

export async function postOrEditPrComment(args: {
  octokit: InstallationOctokit;
  owner: string;
  repo: string;
  repoId: string;
  prNumber: number;
  headSha: string;
  body: string;
}): Promise<{ commentId: bigint; created: boolean }> {
  const { octokit, owner, repo, repoId, prNumber, headSha, body } = args;

  const existing = await db.prComment.findUnique({
    where: { repoId_prNumber: { repoId, prNumber } }
  });

  if (existing?.githubCommentId) {
    try {
      const { data } = await octokit.request(
        "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
        { owner, repo, comment_id: Number(existing.githubCommentId), body }
      );
      await db.prComment.update({
        where: { repoId_prNumber: { repoId, prNumber } },
        data: { lastHeadSha: headSha }
      });
      return { commentId: BigInt(data.id), created: false };
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status !== 404) throw err;
      // comment was deleted on GitHub; fall through to create a new one
    }
  }

  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    { owner, repo, issue_number: prNumber, body }
  );

  await db.prComment.upsert({
    where: { repoId_prNumber: { repoId, prNumber } },
    create: {
      repoId,
      prNumber,
      githubCommentId: BigInt(data.id),
      lastHeadSha: headSha
    },
    update: {
      githubCommentId: BigInt(data.id),
      lastHeadSha: headSha
    }
  });

  return { commentId: BigInt(data.id), created: true };
}
