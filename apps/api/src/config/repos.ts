import type { Environment } from "@cloudnonic/delivery-contracts";

export interface RepoConfig {
  name: string;
  owner: string;
  host: "Netlify" | "Forge";
  branches: Record<Environment, string>;
}

// To add a repository, append it here; its host token and ids go in the environment.
export const TENSORPARC_REPOS: RepoConfig[] = [
  {
    name: "belture-frontend",
    owner: "TensorParc-Inc",
    host: "Netlify",
    branches: { production: "main", staging: "staging", develop: "develop" },
  },
  {
    name: "belture-api",
    owner: "TensorParc-Inc",
    host: "Forge",
    branches: { production: "main", staging: "staging", develop: "develop" },
  },
];
