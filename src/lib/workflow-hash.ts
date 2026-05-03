import { createHash } from "node:crypto";
import type { InstallationOctokit } from "./octokit";

const WORKFLOWS_DIR = ".github/workflows";

interface DirItem {
  type: string;
  name: string;
  path: string;
  sha: string;
}

export async function fetchWorkflowsHash(args: {
  octokit: InstallationOctokit;
  owner: string;
  repo: string;
  ref: string;
}): Promise<string | null> {
  const { octokit, owner, repo, ref } = args;
  let listing: DirItem[];
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner, repo, path: WORKFLOWS_DIR, ref }
    );
    if (!Array.isArray(data)) return null;
    listing = data as unknown as DirItem[];
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }

  const yaml = listing
    .filter((f) => f.type === "file" && /\.ya?ml$/i.test(f.name))
    .sort((a, b) => a.path.localeCompare(b.path));

  if (yaml.length === 0) return null;

  const h = createHash("sha256");
  for (const f of yaml) {
    h.update(f.path);
    h.update("\0");
    h.update(f.sha);
    h.update("\0");
  }
  return h.digest("hex").slice(0, 16);
}
