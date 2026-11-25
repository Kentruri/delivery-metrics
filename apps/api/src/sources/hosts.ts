import { type Environment, environmentSchema } from "@cloudnonic/delivery-contracts";
import { z } from "zod";
import type { RepoConfig } from "../config/repos.js";
import type { HostDeploy } from "../sync/types.js";
import { createJsonClient, type Fetcher, parseTime } from "./http.js";

export interface HostSource {
  deploys: (repo: RepoConfig, since: number) => Promise<HostDeploy[]>;
}

const ENVIRONMENTS = environmentSchema.options;
const PAGE = 100;
const MAX_PAGES = 50;
// A ready deploy published long after it was built was published again: a rollback.
const REPUBLISH_GAP = 60 * 60 * 1000;

const NETLIFY_IN_PROGRESS = new Set([
  "new",
  "pending_review",
  "accepted",
  "enqueued",
  "building",
  "uploading",
  "uploaded",
  "preparing",
  "prepared",
  "processing",
  "processed",
  "retrying",
]);

const netlifyDeploy = z.object({
  id: z.string(),
  state: z.string(),
  context: z.string().nullish(),
  commit_ref: z.string().nullish(),
  created_at: z.string(),
  published_at: z.string().nullish(),
  deploy_time: z.number().nullish(),
  title: z.string().nullish(),
  committer: z.string().nullish(),
  error_message: z.string().nullish(),
});

const fromNetlify = (
  item: z.infer<typeof netlifyDeploy>,
  environment: Environment,
  since: number,
): HostDeploy[] => {
  if (item.context === "deploy-preview" || NETLIFY_IN_PROGRESS.has(item.state)) {
    return [];
  }
  if (item.state === "error" && /cancel|skip/i.test(item.error_message ?? "")) {
    return [];
  }
  const built = parseTime(item.created_at) + (item.deploy_time ?? 0) * 1000;
  if (built < since) {
    return [];
  }
  const base = {
    source: "Netlify" as const,
    environment,
    sha: item.commit_ref ?? null,
    author: item.committer ?? null,
    message: item.title ?? "",
  };
  const records: HostDeploy[] = [
    {
      ...base,
      id: `netlify:${item.id}`,
      status: item.state === "ready" ? "succeeded" : "failed",
      finishedAt: built,
    },
  ];
  const published = item.published_at ? parseTime(item.published_at) : null;
  if (item.state === "ready" && published !== null && published - built > REPUBLISH_GAP) {
    records.push({
      ...base,
      id: `netlify:${item.id}:published`,
      status: "succeeded",
      finishedAt: published,
    });
  }
  return records;
};

export const createNetlify = (
  token: string,
  sites: Record<string, string>,
  fetcher?: Fetcher,
): HostSource => {
  const client = createJsonClient(
    "https://api.netlify.com",
    { authorization: `Bearer ${token}` },
    fetcher,
  );
  return {
    deploys: async (repo, since) => {
      const records: HostDeploy[] = [];
      for (const environment of ENVIRONMENTS) {
        const site = sites[environment] ?? sites["*"];
        if (!site) {
          continue;
        }
        const branch = encodeURIComponent(repo.branches[environment]);
        for (let page = 1; page <= MAX_PAGES; page += 1) {
          const items = await client.get(
            `/api/v1/sites/${site}/deploys?branch=${branch}&per_page=${PAGE}&page=${page}`,
            z.array(netlifyDeploy),
          );
          for (const item of items) {
            records.push(...fromNetlify(item, environment, since));
          }
          const oldest = items.at(-1);
          if (items.length < PAGE || (oldest && parseTime(oldest.created_at) < since)) {
            break;
          }
        }
      }
      return records;
    },
  };
};

const forgePage = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: z.object({ next_cursor: z.string().nullish() }) });

const forgeSitesPage = forgePage(
  z.object({
    id: z.string(),
    attributes: z.object({
      repository: z.object({ url: z.string().nullish(), branch: z.string().nullish() }).nullish(),
    }),
  }),
);

const forgeDeploymentsPage = forgePage(
  z.object({
    id: z.string(),
    attributes: z.object({
      commit: z
        .object({
          hash: z.string().nullish(),
          author: z.string().nullish(),
          message: z.string().nullish(),
        })
        .nullish(),
      status: z.string(),
      started_at: z.string().nullish(),
      ended_at: z.string().nullish(),
    }),
  }),
);

const FORGE_STATUS: Record<string, HostDeploy["status"]> = {
  finished: "succeeded",
  failed: "failed",
  "failed-build": "failed",
};

// "git@github.com:Owner/repo.git", "https://github.com/Owner/repo" or "Owner/repo" -> "owner/repo".
export const repositoryOf = (url: string | null | undefined) =>
  url
    ?.replace(/\.git$/, "")
    .match(/[^/:]+\/[^/:]+$/)?.[0]
    .toLowerCase() ?? null;

const withCursor = (params: Record<string, string>, cursor: string | null | undefined) => {
  const search = new URLSearchParams(params);
  if (cursor) {
    search.set("page[cursor]", cursor);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

export interface ForgeTarget {
  organization: string;
  // Each environment's site is found on these servers by repository and branch.
  servers: string[];
}

export const createForge = (
  token: string,
  { organization, servers }: ForgeTarget,
  fetcher?: Fetcher,
): HostSource => {
  const client = createJsonClient(
    "https://forge.laravel.com",
    { authorization: `Bearer ${token}`, "content-type": "application/json" },
    fetcher,
  );
  const sitesPath = (server: string) =>
    `/api/orgs/${encodeURIComponent(organization)}/servers/${encodeURIComponent(server)}/sites`;

  const listSites = async () => {
    const sites: (z.infer<typeof forgeSitesPage>["data"][number] & { server: string })[] = [];
    for (const server of servers) {
      let cursor: string | null | undefined;
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const result: z.infer<typeof forgeSitesPage> = await client.get(
          `${sitesPath(server)}${withCursor({}, cursor)}`,
          forgeSitesPage,
        );
        sites.push(...result.data.map((site) => ({ ...site, server })));
        cursor = result.meta.next_cursor;
        if (!cursor) {
          break;
        }
      }
    }
    return sites;
  };

  return {
    deploys: async (repo, since) => {
      const sites = await listSites();
      const repository = `${repo.owner}/${repo.name}`.toLowerCase();
      const records: HostDeploy[] = [];
      for (const environment of ENVIRONMENTS) {
        const site = sites.find(
          ({ attributes }) =>
            repositoryOf(attributes.repository?.url) === repository &&
            attributes.repository?.branch === repo.branches[environment],
        );
        if (!site) {
          continue;
        }
        let cursor: string | null | undefined;
        for (let page = 1; page <= MAX_PAGES; page += 1) {
          const result: z.infer<typeof forgeDeploymentsPage> = await client.get(
            `${sitesPath(site.server)}/${encodeURIComponent(site.id)}/deployments${withCursor({ sort: "-created_at" }, cursor)}`,
            forgeDeploymentsPage,
          );
          let oldest = Number.POSITIVE_INFINITY;
          for (const { id, attributes } of result.data) {
            const stamp = attributes.ended_at ?? attributes.started_at;
            if (!stamp) {
              continue;
            }
            const finishedAt = parseTime(stamp);
            oldest = Math.min(oldest, finishedAt);
            const status = FORGE_STATUS[attributes.status];
            if (status && finishedAt >= since) {
              records.push({
                id: `forge:${id}`,
                source: "Forge",
                environment,
                sha: attributes.commit?.hash ?? null,
                status,
                finishedAt,
                author: attributes.commit?.author ?? null,
                message: attributes.commit?.message ?? "",
              });
            }
          }
          cursor = result.meta.next_cursor;
          if (!cursor || oldest < since) {
            break;
          }
        }
      }
      return records;
    },
  };
};
