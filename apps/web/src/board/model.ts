import type { ConflictKind, DeployKind, Environment, Source } from "@cloudnonic/delivery-contracts";

// The repo filter's value for every repo on the board.
export const ALL_REPOS = "all";

export interface ChangeItem {
  kind: "feature" | "fix";
  title: string;
  ticket: string | null;
  pullNumber: number;
}

export interface DeployChanges {
  items: ChangeItem[];
  internalCount: number;
}

export interface DeployView {
  id: string;
  service: string;
  environment: Environment;
  source: Source;
  status: "succeeded" | "failed";
  kind: DeployKind;
  counted: boolean;
  version: string;
  sha: string | null;
  shippedBy: string | null;
  title: string;
  pullNumber: number | null;
  finishedAt: Date;
  hotfixAt?: Date;
  rollbackAt?: Date;
  leadTimesHours: number[];
  changes: DeployChanges;
  conflict: ConflictKind | null;
}

// deployed: staging and develop, where no watch applies. build-failed: never went live.
export type Verdict =
  | { kind: "watching"; msLeft: number }
  | { kind: "clean" }
  | { kind: "failed"; reason: "hotfix" | "rollback"; at: Date }
  | { kind: "deployed" }
  | { kind: "build-failed" };
