import type {
  Conflict,
  Deploy,
  HistoryResponse,
  Source,
  SourceStatus,
} from "@cloudnonic/delivery-contracts";
import type { DeployView } from "./model";

export const GITHUB_OWNER = "TensorParc-Inc";

export const pullUrl = (repo: string, number: number) =>
  `https://github.com/${GITHUB_OWNER}/${repo}/pull/${number}`;

export const releaseUrl = (repo: string, tag: string) =>
  `https://github.com/${GITHUB_OWNER}/${repo}/releases/tag/${tag}`;

export interface BoardData {
  since: Date;
  generatedAt: Date;
  repos: { name: string; host: Source }[];
  sources: SourceStatus[];
  deploys: DeployView[];
  conflicts: Conflict[];
}

const optionalDate = (value: string | null) => (value ? new Date(value) : undefined);

export const toDeployView = (deploy: Deploy): DeployView => ({
  id: deploy.id,
  service: deploy.repo,
  environment: deploy.environment,
  source: deploy.source,
  status: deploy.status,
  kind: deploy.kind,
  counted: deploy.counted,
  version: deploy.version,
  sha: deploy.sha,
  shippedBy: deploy.triggeredBy,
  title: deploy.title,
  pullNumber: deploy.pullNumber,
  finishedAt: new Date(deploy.finishedAt),
  hotfixAt: optionalDate(deploy.hotfixAt),
  rollbackAt: optionalDate(deploy.rollbackAt),
  leadTimesHours: deploy.leadTimesHours,
  changes: { items: deploy.changes, internalCount: deploy.internalChanges },
  conflict: deploy.conflict,
});

export const toBoard = (history: HistoryResponse): BoardData => ({
  since: new Date(history.since),
  generatedAt: new Date(history.generatedAt),
  repos: history.repos,
  sources: history.sources,
  deploys: history.deploys.map(toDeployView),
  conflicts: history.conflicts,
});

// Hosts without a token: their deploys are inferred from GitHub merges.
export const disconnectedHosts = (board: Pick<BoardData, "repos" | "sources">) =>
  board.repos
    .filter(
      (repo) =>
        !board.sources.some(
          (status) => status.repo === repo.name && status.source === repo.host && status.connected,
        ),
    )
    .map((repo) => repo.host);

export const lastSyncedAt = (sources: SourceStatus[]) => {
  const times = sources
    .map((status) => (status.syncedAt ? Date.parse(status.syncedAt) : Number.NaN))
    .filter((time) => !Number.isNaN(time));
  return times.length > 0 ? new Date(Math.max(...times)) : null;
};
