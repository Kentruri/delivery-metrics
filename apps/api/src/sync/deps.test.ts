import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../db/store.js";
import { loadEnv } from "../env.js";
import { syncDepsFrom } from "./deps.js";

describe("syncDepsFrom", () => {
  it("needs a GitHub token", () => {
    expect(syncDepsFrom(loadEnv({}), createMemoryStore())).toBeNull();
  });

  it("adds each host whose token and ids are set", () => {
    const only = syncDepsFrom(loadEnv({ TP_GITHUB_TOKEN: "t" }), createMemoryStore());
    expect(only?.hosts).toEqual({});
    expect(only?.since).toBe(Date.UTC(2026, 0, 1));

    const both = syncDepsFrom(
      loadEnv({
        TP_GITHUB_TOKEN: "t",
        TP_NETLIFY_TOKEN: "n",
        TP_NETLIFY_SITES: "site",
        TP_FORGE_TOKEN: "f",
        TP_FORGE_ORG: "tensorparc",
        TP_FORGE_SERVERS: "99,77",
        HISTORY_SINCE: "2026-06-01",
      }),
      createMemoryStore(),
    );
    expect(Object.keys(both?.hosts ?? {})).toEqual(["Netlify", "Forge"]);
    expect(both?.repos.map((repo) => repo.name)).toEqual(["belture-frontend", "belture-api"]);
    expect(both?.since).toBe(Date.UTC(2026, 5, 1));
  });
});
