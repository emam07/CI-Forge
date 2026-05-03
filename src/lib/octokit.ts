import { App } from "@octokit/app";
import { Octokit } from "@octokit/core";
import { paginateRest, type PaginateInterface } from "@octokit/plugin-paginate-rest";
import { env } from "./env";

const PaginatedOctokit = Octokit.plugin(paginateRest);

export const githubApp = new App({
  Octokit: PaginatedOctokit,
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
  webhooks: {
    secret: env.GITHUB_APP_WEBHOOK_SECRET
  }
});

export type InstallationOctokit = InstanceType<typeof Octokit> & { paginate: PaginateInterface };

export async function octokitForInstallation(
  installationId: number | bigint
): Promise<InstallationOctokit> {
  const octokit = await githubApp.getInstallationOctokit(Number(installationId));
  return octokit as unknown as InstallationOctokit;
}
