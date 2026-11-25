import { environmentSchema, type SyncReport } from "@cloudnonic/delivery-contracts";
import type { RepoConfig } from "../config/repos.js";
import type { Store } from "../db/store.js";
import type { GitHubSource } from "../sources/github.js";
import type { HostSource } from "../sources/hosts.js";
import { derive, plannedRanges, rangeKey } from "./derive.js";
import { reconcile } from "./reconcile.js";
import type { HostDeploy } from "./types.js";

// Merges before the window give the first deploy of the window its base commit.
const LOOKBACK_MS = 90 * 24 * 3_600_000;

export interface SyncDeps {
  repos: RepoConfig[];
  github: GitHubSource;
  hosts: Partial<Record<RepoConfig["host"], HostSource>>;
  store: Store;
  since: number;
  now: () => number;
}

type RepoReport = SyncReport["repos"][number];

const iso = (time: number | null | undefined) =>
  time === null || time === undefined ? null : new Date(time).toISOString();

const syncRepo = async (repo: RepoConfig, deps: SyncDeps): Promise<RepoReport> => {
  const { github, store, since } = deps;
  const from = since - LOOKBACK_MS;
  const merges = (
    await Promise.all(
      environmentSchema.options.map((environment) => github.merges(repo, environment, from)),
    )
  ).flat();
  const releases = await github.releases(repo, from);

  const host = deps.hosts[repo.host];
  let hostDeploys: HostDeploy[] | null = null;
  if (host) {
    await store.saveHostDeploys(repo.name, await host.deploys(repo, since));
    hostDeploys = await store.loadHostDeploys(repo.name);
  }

  const reconciled = reconcile({
    repo: repo.name,
    host: repo.host,
    branches: repo.branches,
    merges,
    hostDeploys,
    releases,
  });

  const ranges = await store.loadRanges(repo.name);
  for (const range of plannedRanges(reconciled.drafts, since)) {
    if (!ranges.has(rangeKey(range))) {
      const commits = await github.range(repo, range.base, range.head);
      ranges.set(rangeKey(range), commits);
      await store.saveRange(repo.name, range, commits);
    }
  }

  const deploys = derive({ drafts: reconciled.drafts, releases, merges, ranges, since });
  const conflicts = reconciled.conflicts.filter((conflict) => Date.parse(conflict.at) >= since);
  await store.replaceRepo(repo.name, deploys, conflicts);

  const syncedAt = iso(deps.now());
  const hostFrom = Object.values(reconciled.coversFrom);
  await store.saveSourceStatus({
    repo: repo.name,
    source: "GitHub",
    connected: true,
    coversFrom: iso(since),
    syncedAt,
  });
  await store.saveSourceStatus({
    repo: repo.name,
    source: repo.host,
    connected: Boolean(host),
    coversFrom: hostFrom.length > 0 ? iso(Math.min(...hostFrom)) : null,
    syncedAt: host ? syncedAt : null,
  });

  return {
    repo: repo.name,
    deploys: deploys.length,
    conflicts: conflicts.length,
    sources: [
      { source: "GitHub", connected: true, records: merges.length },
      { source: repo.host, connected: Boolean(host), records: hostDeploys?.length ?? 0 },
    ],
  };
};

export const runSync = async (deps: SyncDeps): Promise<SyncReport> => {
  const startedAt = iso(deps.now()) as string;
  try {
    const repos: RepoReport[] = [];
    for (const repo of deps.repos) {
      repos.push(await syncRepo(repo, deps));
    }
    const report = { startedAt, finishedAt: iso(deps.now()) as string, repos };
    await deps.store.recordRun({ startedAt, report, error: null });
    return report;
  } catch (error) {
    await deps.store.recordRun({ startedAt, report: null, error: String(error) });
    throw error;
  }
};
