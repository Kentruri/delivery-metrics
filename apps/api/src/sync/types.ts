import type { Environment } from "@cloudnonic/delivery-contracts";

// A pull request merged into an environment branch, as GitHub tells it.
export interface Merge {
  number: number;
  title: string;
  headRef: string;
  environment: Environment;
  sha: string;
  mergedAt: number;
  mergedBy: string | null;
}

// A deploy as the host (Netlify or Forge) recorded it.
export interface HostDeploy {
  id: string;
  source: "Netlify" | "Forge";
  environment: Environment;
  sha: string | null;
  status: "succeeded" | "failed";
  finishedAt: number;
  author: string | null;
  message: string;
}

export interface Release {
  tag: string;
  sha: string | null;
  publishedAt: number;
}

export interface RangeCommit {
  sha: string;
  message: string;
  authoredAt: number | null;
  parents: number;
}
