import { App } from "@octokit/app";
import type { Octokit } from "@octokit/core";
import type { PaginateInterface } from "@octokit/plugin-paginate-rest";
import { env } from "./env";

export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
  webhooks: {
    secret: env.GITHUB_APP_WEBHOOK_SECRET
  }
});

// @octokit/app loads the paginate-rest plugin at runtime; the surfaced type doesn't reflect it.
export type InstallationOctokit = Octokit & { paginate: PaginateInterface };

export async function octokitForInstallation(
  installationId: number | bigint
): Promise<InstallationOctokit> {
  const octokit = await githubApp.getInstallationOctokit(Number(installationId));
  return octokit as unknown as InstallationOctokit;
}
