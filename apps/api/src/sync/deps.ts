import { TENSORPARC_REPOS } from "../config/repos.js";
import type { Store } from "../db/store.js";
import type { Env } from "../env.js";
import { createGitHub, type GitHubSource } from "../sources/github.js";
import { createForge, createNetlify, type HostSource } from "../sources/hosts.js";
import type { Fetcher } from "../sources/http.js";
import type { SyncDeps } from "./run.js";

// GitHub is required; a host without its token is skipped and its deploys are inferred from merges.
export const syncDepsFrom = (
  env: Env,
  store: Store,
  fetcher?: Fetcher,
  now: () => number = Date.now,
): SyncDeps | null => {
  if (!env.TP_GITHUB_TOKEN) {
    return null;
  }
  const github: GitHubSource = createGitHub(env.TP_GITHUB_TOKEN, fetcher);
  const hosts: SyncDeps["hosts"] = {};
  if (env.TP_NETLIFY_TOKEN && env.TP_NETLIFY_SITES) {
    hosts.Netlify = createNetlify(
      env.TP_NETLIFY_TOKEN,
      env.TP_NETLIFY_SITES,
      fetcher,
    ) satisfies HostSource;
  }
  if (env.TP_FORGE_TOKEN && env.TP_FORGE_ORG && env.TP_FORGE_SERVERS?.length) {
    hosts.Forge = createForge(
      env.TP_FORGE_TOKEN,
      { organization: env.TP_FORGE_ORG, servers: env.TP_FORGE_SERVERS },
      fetcher,
    );
  }
  return {
    repos: TENSORPARC_REPOS,
    github,
    hosts,
    store,
    since: Date.parse(`${env.HISTORY_SINCE}T00:00:00Z`),
    now,
  };
};
