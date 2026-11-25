import {
  type Conflict,
  type ConflictKind,
  type DeployKind,
  type Environment,
  environmentSchema,
} from "@cloudnonic/delivery-contracts";
import { kindOfMerge, shortSha, summaryLine } from "./classify.js";
import type { HostDeploy, Merge, Release } from "./types.js";

export interface Draft {
  id: string;
  repo: string;
  environment: Environment;
  source: "Netlify" | "Forge" | "GitHub";
  status: "succeeded" | "failed";
  kind: DeployKind;
  sha: string | null;
  finishedAt: number;
  triggeredBy: string | null;
  title: string;
  pullNumber: number | null;
  conflict: ConflictKind | null;
}

export interface ReconcileInput {
  repo: string;
  host: "Netlify" | "Forge";
  branches: Record<Environment, string>;
  merges: Merge[];
  hostDeploys: HostDeploy[] | null;
  releases: Release[];
}

export interface Reconciled {
  drafts: Draft[];
  conflicts: Conflict[];
  coversFrom: Partial<Record<Environment, number>>;
}

const iso = (time: number) => new Date(time).toISOString();
const day = (time: number) => iso(time).slice(0, 10);

const reconcileEnvironment = (
  input: ReconcileInput,
  environment: Environment,
): { drafts: Draft[]; coversFrom: number | null } => {
  const merges = input.merges.filter((merge) => merge.environment === environment);
  const bySha = new Map(merges.map((merge) => [merge.sha, merge]));
  const matched = new Set<string>();
  const deployed: string[] = [];
  const records = (input.hostDeploys ?? [])
    .filter((record) => record.environment === environment)
    .sort((a, b) => a.finishedAt - b.finishedAt);

  const drafts: Draft[] = records.map((record) => {
    const merge = record.sha ? bySha.get(record.sha) : undefined;
    let kind: DeployKind;
    let conflict: ConflictKind | null = null;
    if (record.sha && record.sha === deployed.at(-1)) {
      kind = "redeploy";
    } else if (record.sha && deployed.includes(record.sha)) {
      kind = "rollback";
    } else if (merge) {
      kind = kindOfMerge(merge);
    } else {
      kind = "change";
      conflict = "no_github_record";
    }
    if (merge) {
      matched.add(merge.sha);
    }
    if (record.status === "succeeded" && record.sha) {
      deployed.push(record.sha);
    }
    return {
      id: record.id,
      repo: input.repo,
      environment,
      source: record.source,
      status: record.status,
      kind,
      sha: record.sha,
      finishedAt: record.finishedAt,
      triggeredBy: merge?.mergedBy ?? record.author,
      title: merge?.title ?? summaryLine(record.message),
      pullNumber: merge?.number ?? null,
      conflict,
    };
  });

  const coversFrom = records[0]?.finishedAt ?? null;
  for (const merge of merges) {
    if (matched.has(merge.sha)) {
      continue;
    }
    const covered =
      input.hostDeploys !== null && coversFrom !== null && merge.mergedAt >= coversFrom;
    drafts.push({
      id: `github:${environment}:${merge.number}`,
      repo: input.repo,
      environment,
      source: "GitHub",
      status: "succeeded",
      kind: kindOfMerge(merge),
      sha: merge.sha,
      finishedAt: merge.mergedAt,
      triggeredBy: merge.mergedBy,
      title: merge.title,
      pullNumber: merge.number,
      conflict: covered ? "no_host_record" : null,
    });
  }
  return { drafts: drafts.sort((a, b) => a.finishedAt - b.finishedAt), coversFrom };
};

const describeConflict = (draft: Draft, input: ReconcileInput): string => {
  const branch = input.branches[draft.environment];
  if (draft.conflict === "no_host_record") {
    return `#${draft.pullNumber} was merged into ${branch} on ${day(draft.finishedAt)}, but ${input.host} has no deploy of ${shortSha(draft.sha)}.`;
  }
  return `${input.host} deployed ${shortSha(draft.sha)} on ${day(draft.finishedAt)}, but GitHub shows no pull request merged into ${branch} with that commit.`;
};

export const reconcile = (input: ReconcileInput): Reconciled => {
  const drafts: Draft[] = [];
  const coversFrom: Partial<Record<Environment, number>> = {};
  for (const environment of environmentSchema.options) {
    const result = reconcileEnvironment(input, environment);
    drafts.push(...result.drafts);
    if (result.coversFrom !== null) {
      coversFrom[environment] = result.coversFrom;
    }
  }

  const conflicts: Conflict[] = drafts
    .filter((draft) => draft.conflict !== null)
    .map((draft) => ({
      id: draft.id,
      repo: input.repo,
      environment: draft.environment,
      kind: draft.conflict as ConflictKind,
      ref: draft.pullNumber ? `#${draft.pullNumber}` : shortSha(draft.sha),
      at: iso(draft.finishedAt),
      detail: describeConflict(draft, input),
    }));

  const productionFrom = coversFrom.production;
  if (input.hostDeploys !== null && productionFrom !== undefined) {
    const deployed = new Set(
      drafts
        .filter((draft) => draft.environment === "production" && draft.source !== "GitHub")
        .map((draft) => draft.sha),
    );
    for (const release of input.releases) {
      if (release.sha && release.publishedAt >= productionFrom && !deployed.has(release.sha)) {
        conflicts.push({
          id: `tag:${input.repo}:${release.tag}`,
          repo: input.repo,
          environment: "production",
          kind: "tag_without_deploy",
          ref: release.tag,
          at: iso(release.publishedAt),
          detail: `Release ${release.tag} (${shortSha(release.sha)}) has no production deploy in ${input.host}.`,
        });
      }
    }
  }

  return { drafts, conflicts, coversFrom };
};
