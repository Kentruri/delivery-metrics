import { describe, expect, it, vi } from "vitest";
import { TENSORPARC_REPOS } from "../config/repos.js";
import { createForge, createNetlify, repositoryOf } from "./hosts.js";
import type { Fetcher } from "./http.js";

const [frontend, api] = TENSORPARC_REPOS as [
  (typeof TENSORPARC_REPOS)[number],
  (typeof TENSORPARC_REPOS)[number],
];
const since = Date.UTC(2026, 0, 1);
const json = (body: unknown) => new Response(JSON.stringify(body));

const netlify = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  state: "ready",
  context: "production",
  commit_ref: `sha-${id}`,
  created_at: "2026-10-26T16:30:00Z",
  published_at: "2026-10-26T16:32:00Z",
  deploy_time: 90,
  title: "Merge pull request #3293 from TensorParc-Inc/staging",
  committer: "Kentruri",
  ...fields,
});

describe("createNetlify", () => {
  it("keeps finished deploys per branch and turns a late publish into its own deploy", async () => {
    const fetcher = vi.fn<Fetcher>(async (url) =>
      json(
        url.searchParams.get("branch") === "main"
          ? [
              netlify("ok"),
              netlify("broken", { state: "error", published_at: null }),
              netlify("canceled", { state: "error", error_message: "Canceled build" }),
              netlify("preview", { context: "deploy-preview" }),
              netlify("building", { state: "building" }),
              netlify("rolled-back", { published_at: "2026-10-28T10:00:00Z" }),
              netlify("old", { created_at: "2025-12-01T10:00:00Z", deploy_time: null }),
            ]
          : [],
      ),
    );
    const records = await createNetlify("token", { "*": "site-1" }, fetcher).deploys(
      frontend,
      since,
    );

    expect(records.map((record) => [record.id, record.status, record.environment])).toEqual([
      ["netlify:ok", "succeeded", "production"],
      ["netlify:broken", "failed", "production"],
      ["netlify:rolled-back", "succeeded", "production"],
      ["netlify:rolled-back:published", "succeeded", "production"],
    ]);
    expect(records[0]).toMatchObject({
      source: "Netlify",
      sha: "sha-ok",
      author: "Kentruri",
      finishedAt: Date.UTC(2026, 9, 26, 16, 31, 30),
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://api.netlify.com/api/v1/sites/site-1/deploys?branch=main&per_page=100&page=1",
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("reads a site per environment and pages until the window starts", async () => {
    const full = Array.from({ length: 100 }, (_, index) => netlify(`d${index}`));
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(json(full))
      .mockResolvedValueOnce(json([netlify("last")]));
    const records = await createNetlify("token", { staging: "site-s" }, fetcher).deploys(
      frontend,
      since,
    );

    expect(records).toHaveLength(101);
    expect(records.every((record) => record.environment === "staging")).toBe(true);
    expect(String(fetcher.mock.calls[1]?.[0])).toContain("/sites/site-s/deploys?branch=staging");
  });
});

describe("createForge", () => {
  const site = (id: string, url: string | null, branch: string) => ({
    id,
    type: "sites",
    attributes: { name: `site-${id}`, repository: { provider: "github", url, branch } },
  });
  const deployment = (id: string, attributes: Record<string, unknown> = {}) => ({
    id,
    type: "deployments",
    attributes: {
      commit: { hash: null, author: null, message: null, branch: null },
      type: "push",
      status: "finished",
      started_at: null,
      ended_at: null,
      ...attributes,
    },
  });
  const page = (data: unknown[], next: string | null = null) => ({
    data,
    meta: { next_cursor: next },
  });
  const SITES = "/api/orgs/tensorparc/servers/99/sites";
  const OTHER = "/api/orgs/tensorparc/servers/77/sites";

  it("finds each environment's site on its server by repository and branch, following the cursors", async () => {
    const fetcher = vi.fn<Fetcher>(async (url) => {
      const cursor = url.searchParams.get("page[cursor]");
      switch (url.pathname) {
        case SITES:
          return json(
            cursor
              ? page([])
              : page(
                  [
                    site("1", "git@github.com:TensorParc-Inc/belture-api.git", "main"),
                    site("3", "git@github.com:someone/else.git", "develop"),
                  ],
                  "s2",
                ),
          );
        case OTHER:
          return json(
            page([site("2", "https://github.com/TensorParc-Inc/belture-API", "staging")]),
          );
        case `${SITES}/1/deployments`:
          return json(
            cursor
              ? page([deployment("9", { ended_at: "2025-11-01T10:00:00Z" })], "d3")
              : page(
                  [
                    deployment("10", {
                      commit: { hash: "abc", author: "Kevin", message: "Merge", branch: "main" },
                      started_at: "2026-10-26T16:28:00.000000Z",
                      ended_at: "2026-10-26T16:30:00.000000Z",
                    }),
                    deployment("11", {
                      commit: { hash: "def", author: null, message: null, branch: "main" },
                      status: "failed-build",
                      started_at: "2026-10-27T10:00:00Z",
                    }),
                    deployment("12", { status: "deploying", started_at: "2026-10-28T10:00:00Z" }),
                    deployment("13"),
                  ],
                  "d2",
                ),
          );
        default:
          return json(
            page([deployment("20", { commit: { hash: "stg" }, ended_at: "2026-10-20T10:00:00Z" })]),
          );
      }
    });
    const records = await createForge(
      "token",
      { organization: "tensorparc", servers: ["99", "77"] },
      fetcher,
    ).deploys(api, since);

    expect(records).toEqual([
      {
        id: "forge:10",
        source: "Forge",
        environment: "production",
        sha: "abc",
        status: "succeeded",
        finishedAt: Date.UTC(2026, 9, 26, 16, 30),
        author: "Kevin",
        message: "Merge",
      },
      {
        id: "forge:11",
        source: "Forge",
        environment: "production",
        sha: "def",
        status: "failed",
        finishedAt: Date.UTC(2026, 9, 27, 10),
        author: null,
        message: "",
      },
      {
        id: "forge:20",
        source: "Forge",
        environment: "staging",
        sha: "stg",
        status: "succeeded",
        finishedAt: Date.UTC(2026, 9, 20, 10),
        author: null,
        message: "",
      },
    ]);
    expect(fetcher.mock.calls.map(([url]) => `${url.pathname}${url.search}`)).toEqual([
      SITES,
      `${SITES}?page%5Bcursor%5D=s2`,
      OTHER,
      `${SITES}/1/deployments?sort=-created_at`,
      `${SITES}/1/deployments?sort=-created_at&page%5Bcursor%5D=d2`,
      `${OTHER}/2/deployments?sort=-created_at`,
    ]);
  });

  it("reads the repository from any of Forge's URL forms", () => {
    expect(repositoryOf("git@github.com:TensorParc-Inc/belture-api.git")).toBe(
      "tensorparc-inc/belture-api",
    );
    expect(repositoryOf("https://github.com/TensorParc-Inc/belture-api")).toBe(
      "tensorparc-inc/belture-api",
    );
    expect(repositoryOf("TensorParc-Inc/belture-api")).toBe("tensorparc-inc/belture-api");
    expect(repositoryOf(null)).toBeNull();
  });
});
