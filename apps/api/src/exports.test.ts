import type { Conflict, Deploy } from "@cloudnonic/delivery-contracts";
import { describe, expect, it } from "vitest";
import { deploysCsv, summaryCsv, toCsv } from "./exports.js";

const now = Date.UTC(2026, 10, 9);

const deploy = (fields: Partial<Deploy>): Deploy => ({
  id: "forge:1",
  repo: "belture-api",
  environment: "production",
  source: "Forge",
  status: "succeeded",
  kind: "change",
  counted: true,
  sha: "abc",
  version: "3.98.0",
  finishedAt: "2026-10-26T16:30:00.000Z",
  triggeredBy: "Kentruri",
  title: "Staging",
  pullNumber: 2138,
  leadTimesHours: [10, 20, 30],
  changes: [],
  internalChanges: 0,
  hotfixAt: null,
  rollbackAt: null,
  conflict: null,
  ...fields,
});

const lines = (csv: string) => csv.trimEnd().split("\r\n");

describe("toCsv", () => {
  it("quotes cells with commas, quotes or line breaks", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          ['say "hi", ok', null],
          [1, true],
        ],
      ),
    ).toBe('a,b\r\n"say ""hi"", ok",\r\n1,true\r\n');
  });
});

describe("deploysCsv", () => {
  it("writes one row per deploy and per release tag that never shipped, in time order", () => {
    const conflicts: Conflict[] = [
      {
        id: "github:production:2140",
        repo: "belture-api",
        environment: "production",
        kind: "no_host_record",
        ref: "#2140",
        at: "2026-10-27T10:00:00.000Z",
        detail: "Forge has no deploy",
      },
      {
        id: "tag:belture-api:v3.97.1",
        repo: "belture-api",
        environment: "production",
        kind: "tag_without_deploy",
        ref: "v3.97.1",
        at: "2026-10-20T10:00:00.000Z",
        detail: "Release v3.97.1 has no production deploy in Forge.",
      },
    ];
    const rows = lines(
      deploysCsv(
        [
          deploy({ hotfixAt: "2026-10-27T15:59:18.000Z" }),
          deploy({
            id: "github:production:2140",
            source: "GitHub",
            finishedAt: "2026-10-27T10:00:00.000Z",
            conflict: "no_host_record",
            leadTimesHours: [],
          }),
          deploy({ id: "s", environment: "staging", finishedAt: "2026-10-25T10:00:00.000Z" }),
        ],
        conflicts,
        now,
      ),
    );

    expect(rows[0]?.split(",")).toHaveLength(18);
    expect(rows.slice(1).map((row) => row.split(",").slice(0, 3).join(","))).toEqual([
      "2026-10-20T10:00:00.000Z,belture-api,production",
      "2026-10-25T10:00:00.000Z,belture-api,staging",
      "2026-10-26T16:30:00.000Z,belture-api,production",
      "2026-10-27T10:00:00.000Z,belture-api,production",
    ]);
    expect(rows[1]).toContain("not deployed,release tag,false,3.97.1");
    expect(rows[3]).toContain(",20,27,failed,hotfix,,");
    expect(rows[4]).toContain(",,,clean,,no_host_record,Forge has no deploy");
  });
});

describe("summaryCsv", () => {
  it("counts each month per repo and for all repos, with the failure rate in production", () => {
    const rows = lines(
      summaryCsv(
        [
          deploy({ hotfixAt: "2026-10-27T15:59:18.000Z" }),
          deploy({ id: "2", finishedAt: "2026-10-26T18:00:00.000Z", leadTimesHours: [40] }),
          deploy({ id: "3", repo: "belture-frontend", finishedAt: "2026-11-08T10:00:00.000Z" }),
          deploy({ id: "4", environment: "staging", leadTimesHours: [] }),
          deploy({ id: "5", kind: "release", counted: false }),
        ],
        now,
      ),
    );

    expect(rows).toEqual([
      "month_utc,repo,environment,deploys,release_days,lead_time_median_hours,lead_time_p85_hours,failed,finished_watches,failure_rate_percent",
      "2026-10,all,production,2,1,25,35.5,1,2,50",
      "2026-10,all,staging,1,1,,,,,",
      "2026-10,belture-api,production,2,1,25,35.5,1,2,50",
      "2026-10,belture-api,staging,1,1,,,,,",
      "2026-11,all,production,1,1,20,27,0,0,",
      "2026-11,belture-frontend,production,1,1,20,27,0,0,",
    ]);
  });
});
