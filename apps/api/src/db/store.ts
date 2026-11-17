import type {
  Conflict,
  Deploy,
  Environment,
  SourceStatus,
  SyncReport,
} from "@cloudnonic/delivery-contracts";
import type { RangeRequest } from "../sync/derive.js";
import type { HostDeploy, RangeCommit } from "../sync/types.js";

export type ExportScope = Environment | "all";

export interface Store {
  loadHostDeploys: (repo: string) => Promise<HostDeploy[]>;
  saveHostDeploys: (repo: string, records: HostDeploy[]) => Promise<void>;
  loadRanges: (repo: string) => Promise<Map<string, RangeCommit[]>>;
  saveRange: (repo: string, range: RangeRequest, commits: RangeCommit[]) => Promise<void>;
  replaceRepo: (repo: string, deploys: Deploy[], conflicts: Conflict[]) => Promise<void>;
  saveSourceStatus: (status: SourceStatus) => Promise<void>;
  deploys: (scope: ExportScope) => Promise<Deploy[]>;
  conflicts: (scope: ExportScope) => Promise<Conflict[]>;
  sources: () => Promise<SourceStatus[]>;
  recordRun: (run: {
    startedAt: string;
    report: SyncReport | null;
    error: string | null;
  }) => Promise<void>;
  close: () => Promise<void>;
}

const inScope = (scope: ExportScope) => (item: { environment: Environment }) =>
  scope === "all" || item.environment === scope;

const byTime =
  <T>(time: (item: T) => string) =>
  (a: T, b: T) =>
    Date.parse(time(a)) - Date.parse(time(b));

// Holds everything in memory: dry runs and tests.
export const createMemoryStore = (): Store & { runs: unknown[] } => {
  const hostDeploys = new Map<string, HostDeploy & { repo: string }>();
  const ranges = new Map<string, Map<string, RangeCommit[]>>();
  const deploys = new Map<string, Deploy[]>();
  const conflicts = new Map<string, Conflict[]>();
  const sources = new Map<string, SourceStatus>();
  const runs: unknown[] = [];

  return {
    runs,
    loadHostDeploys: async (repo) =>
      [...hostDeploys.values()]
        .filter((record) => record.repo === repo)
        .map(({ repo: _repo, ...record }) => record),
    saveHostDeploys: async (repo, records) => {
      for (const record of records) {
        hostDeploys.set(record.id, { ...record, repo });
      }
    },
    loadRanges: async (repo) => new Map(ranges.get(repo)),
    saveRange: async (repo, range, commits) => {
      const known = ranges.get(repo) ?? new Map<string, RangeCommit[]>();
      known.set(`${range.base}...${range.head}`, commits);
      ranges.set(repo, known);
    },
    replaceRepo: async (repo, nextDeploys, nextConflicts) => {
      deploys.set(repo, nextDeploys);
      conflicts.set(repo, nextConflicts);
    },
    saveSourceStatus: async (status) => {
      sources.set(`${status.repo}:${status.source}`, status);
    },
    deploys: async (scope) =>
      [...deploys.values()]
        .flat()
        .filter(inScope(scope))
        .sort(byTime((deploy) => deploy.finishedAt)),
    conflicts: async (scope) =>
      [...conflicts.values()]
        .flat()
        .filter(inScope(scope))
        .sort(byTime((conflict) => conflict.at)),
    sources: async () => [...sources.values()],
    recordRun: async (run) => {
      runs.push(run);
    },
    close: async () => {},
  };
};
