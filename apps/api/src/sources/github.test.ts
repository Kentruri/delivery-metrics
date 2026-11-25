import { describe, expect, it, vi } from "vitest";
import { TENSORPARC_REPOS } from "../config/repos.js";
import { createGitHub } from "./github.js";
import type { Fetcher } from "./http.js";

const repo = TENSORPARC_REPOS[0] as (typeof TENSORPARC_REPOS)[number];
const json = (body: unknown) => new Response(JSON.stringify(body));
const page = (hasNextPage: boolean, endCursor: string | null) => ({ hasNextPage, endCursor });

describe("createGitHub", () => {
  it("pages through merged pull requests and skips anything that is not one", async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        json({
          data: {
            search: {
              pageInfo: page(true, "c1"),
              nodes: [
                {
                  number: 2,
                  title: "Staging",
                  mergedAt: "2026-10-26T16:30:00Z",
                  headRefName: "staging",
                  mergeCommit: { oid: "b" },
                  mergedBy: { login: "Kentruri" },
                },
                {},
              ],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        json({
          data: {
            search: {
              pageInfo: page(false, null),
              nodes: [
                {
                  number: 1,
                  title: "Staging",
                  mergedAt: "2026-10-02T16:00:00Z",
                  headRefName: "staging",
                  mergeCommit: { oid: "a" },
                  mergedBy: null,
                },
              ],
            },
          },
        }),
      );
    const merges = await createGitHub("token", fetcher).merges(
      repo,
      "production",
      Date.UTC(2026, 0, 1),
    );

    expect(merges.map((merge) => [merge.number, merge.sha, merge.mergedBy])).toEqual([
      [1, "a", null],
      [2, "b", "Kentruri"],
    ]);
    const body = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body));
    expect(body.variables).toEqual({
      query: "repo:TensorParc-Inc/belture-frontend is:pr is:merged base:main merged:>=2026-01-01",
      after: "c1",
    });
  });

  it("reads published releases until they are older than the window", async () => {
    const releases = (nodes: unknown[], hasNextPage: boolean) =>
      json({ data: { repository: { releases: { pageInfo: page(hasNextPage, "r1"), nodes } } } });
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(
        releases(
          [
            {
              tagName: "v3.112.1",
              publishedAt: "2026-10-28T19:13:22Z",
              isDraft: false,
              tagCommit: { oid: "x" },
            },
            { tagName: "v3.113.0", publishedAt: null, isDraft: true, tagCommit: null },
          ],
          true,
        ),
      )
      .mockResolvedValueOnce(
        releases(
          [
            {
              tagName: "v3.40.0",
              publishedAt: "2025-06-01T10:00:00Z",
              isDraft: false,
              tagCommit: null,
            },
          ],
          true,
        ),
      );
    const found = await createGitHub("token", fetcher).releases(repo, Date.UTC(2026, 0, 1));

    expect(found).toEqual([
      { tag: "v3.112.1", sha: "x", publishedAt: Date.UTC(2026, 9, 28, 19, 13, 22) },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("raises GraphQL errors", async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValue(json({ errors: [{ message: "Bad credentials" }] }));
    await expect(createGitHub("token", fetcher).releases(repo, 0)).rejects.toThrow(
      "GitHub GraphQL: Bad credentials",
    );
  });

  it("pages through a comparison until every commit is read", async () => {
    const commit = (sha: string, parents: number) => ({
      sha,
      parents: Array.from({ length: parents }, () => ({ sha: "p" })),
      commit: {
        message: `m ${sha}`,
        author: sha === "z" ? null : { date: "2026-10-20T10:00:00Z" },
      },
    });
    const first = Array.from({ length: 100 }, (_, index) => commit(`c${index}`, 1));
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(json({ total_commits: 101, commits: first }))
      .mockResolvedValueOnce(json({ total_commits: 101, commits: [commit("z", 2)] }));
    const commits = await createGitHub("token", fetcher).range(repo, "a", "b");

    expect(commits).toHaveLength(101);
    expect(commits.at(-1)).toEqual({ sha: "z", message: "m z", authoredAt: null, parents: 2 });
    expect(String(fetcher.mock.calls[1]?.[0])).toBe(
      "https://api.github.com/repos/TensorParc-Inc/belture-frontend/compare/a...b?per_page=100&page=2",
    );
  });
});
