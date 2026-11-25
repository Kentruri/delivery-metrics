import type { Environment } from "@cloudnonic/delivery-contracts";
import { z } from "zod";
import type { RepoConfig } from "../config/repos.js";
import type { Merge, RangeCommit, Release } from "../sync/types.js";
import { createJsonClient, type Fetcher, parseTime, SourceError } from "./http.js";

const MERGES_QUERY = `query ($query: String!, $after: String) {
  search(type: ISSUE, query: $query, first: 100, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        number title mergedAt headRefName
        mergeCommit { oid }
        mergedBy { login }
      }
    }
  }
}`;

const RELEASES_QUERY = `query ($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    releases(first: 100, after: $after, orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes { tagName publishedAt isDraft tagCommit { oid } }
    }
  }
}`;

const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() });

const graphql = <T extends z.ZodType>(data: T) =>
  z.object({
    data: data.nullable().optional(),
    errors: z.array(z.object({ message: z.string() })).optional(),
  });

const mergeNode = z.object({
  number: z.number(),
  title: z.string(),
  mergedAt: z.string().nullable(),
  headRefName: z.string(),
  mergeCommit: z.object({ oid: z.string() }).nullable(),
  mergedBy: z.object({ login: z.string() }).nullable(),
});

const mergesData = z.object({ search: z.object({ pageInfo, nodes: z.array(z.unknown()) }) });
const mergesAnswer = graphql(mergesData);

const releasesData = z.object({
  repository: z.object({
    releases: z.object({
      pageInfo,
      nodes: z.array(
        z.object({
          tagName: z.string(),
          publishedAt: z.string().nullable(),
          isDraft: z.boolean(),
          tagCommit: z.object({ oid: z.string() }).nullable(),
        }),
      ),
    }),
  }),
});
const releasesAnswer = graphql(releasesData);

const compareAnswer = z.object({
  total_commits: z.number(),
  commits: z.array(
    z.object({
      sha: z.string(),
      parents: z.array(z.object({ sha: z.string() })),
      commit: z.object({
        message: z.string(),
        author: z.object({ date: z.string() }).nullable(),
      }),
    }),
  ),
});

const PAGE = 100;

export interface GitHubSource {
  merges: (repo: RepoConfig, environment: Environment, since: number) => Promise<Merge[]>;
  releases: (repo: RepoConfig, since: number) => Promise<Release[]>;
  range: (repo: RepoConfig, base: string, head: string) => Promise<RangeCommit[]>;
}

export const createGitHub = (token: string, fetcher?: Fetcher): GitHubSource => {
  const client = createJsonClient(
    "https://api.github.com",
    { authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" },
    fetcher,
  );

  const query = async <T extends z.ZodType>(
    text: string,
    variables: Record<string, unknown>,
    schema: ReturnType<typeof graphql<T>>,
  ): Promise<z.infer<T>> => {
    const answer = await client.post("/graphql", { query: text, variables }, schema);
    if (answer.errors?.length || !answer.data) {
      throw new SourceError(
        `GitHub GraphQL: ${answer.errors?.map((error) => error.message).join("; ")}`,
      );
    }
    return answer.data as z.infer<T>;
  };

  return {
    merges: async (repo, environment, since) => {
      const day = new Date(since).toISOString().slice(0, 10);
      const search = `repo:${repo.owner}/${repo.name} is:pr is:merged base:${repo.branches[environment]} merged:>=${day}`;
      const merges: Merge[] = [];
      let after: string | null = null;
      do {
        const data: z.infer<typeof mergesData> = await query(
          MERGES_QUERY,
          { query: search, after },
          mergesAnswer,
        );
        for (const node of data.search.nodes) {
          const parsed = mergeNode.safeParse(node);
          if (parsed.success && parsed.data.mergedAt && parsed.data.mergeCommit) {
            merges.push({
              number: parsed.data.number,
              title: parsed.data.title,
              headRef: parsed.data.headRefName,
              environment,
              sha: parsed.data.mergeCommit.oid,
              mergedAt: parseTime(parsed.data.mergedAt),
              mergedBy: parsed.data.mergedBy?.login ?? null,
            });
          }
        }
        after = data.search.pageInfo.hasNextPage ? data.search.pageInfo.endCursor : null;
      } while (after);
      return merges.sort((a, b) => a.mergedAt - b.mergedAt);
    },

    releases: async (repo, since) => {
      const releases: Release[] = [];
      let after: string | null = null;
      do {
        const data: z.infer<typeof releasesData> = await query(
          RELEASES_QUERY,
          { owner: repo.owner, name: repo.name, after },
          releasesAnswer,
        );
        const { nodes, pageInfo: page } = data.repository.releases;
        for (const node of nodes) {
          if (!node.isDraft && node.publishedAt) {
            releases.push({
              tag: node.tagName,
              sha: node.tagCommit?.oid ?? null,
              publishedAt: parseTime(node.publishedAt),
            });
          }
        }
        const oldest = releases.at(-1)?.publishedAt ?? Number.POSITIVE_INFINITY;
        after = page.hasNextPage && oldest >= since ? page.endCursor : null;
      } while (after);
      return releases.filter((release) => release.publishedAt >= since).reverse();
    },

    range: async (repo, base, head) => {
      const commits: RangeCommit[] = [];
      for (let page = 1; ; page += 1) {
        const data = await client.get(
          `/repos/${repo.owner}/${repo.name}/compare/${base}...${head}?per_page=${PAGE}&page=${page}`,
          compareAnswer,
        );
        for (const item of data.commits) {
          commits.push({
            sha: item.sha,
            message: item.commit.message,
            authoredAt: item.commit.author ? parseTime(item.commit.author.date) : null,
            parents: item.parents.length,
          });
        }
        if (data.commits.length < PAGE || commits.length >= data.total_commits) {
          return commits;
        }
      }
    },
  };
};
