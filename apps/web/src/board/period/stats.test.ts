import { describe, expect, it } from "vitest";
import type { ChangeItem } from "../model";
import type { DeployHistory, HistoryDeploy, PeriodFilters } from "./model";
import {
  buildPeriodReport,
  decidedOf,
  failureRate,
  outcomeOf,
  percentile,
  perWeek,
  statsOf,
} from "./stats";

const HOUR = 3_600_000;
const now = new Date(2026, 9, 30, 14, 0);
const at = (month: number, date: number, hour = 12) => new Date(2026, month, date, hour);
const october = { start: new Date(2026, 9, 1), end: now };

const change = (kind: ChangeItem["kind"], pullNumber: number): ChangeItem => ({
  kind,
  title: `Change ${pullNumber}`,
  ticket: null,
  pullNumber,
});

const deploy = (
  fields: Partial<HistoryDeploy> & Pick<HistoryDeploy, "id" | "finishedAt">,
): HistoryDeploy => ({
  service: "belture-api",
  environment: "production",
  source: "Forge",
  status: "succeeded",
  kind: "change",
  counted: true,
  version: "1.0.0",
  sha: "abc",
  shippedBy: null,
  title: "Staging",
  pullNumber: null,
  leadTimesHours: [10],
  changes: { items: [change("feature", 1)], internalCount: 0 },
  conflict: null,
  ...fields,
});

describe("percentile", () => {
  it("interpolates between the closest values", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0.85)).toBeCloseTo(3.55);
    expect(percentile([7], 0.85)).toBe(7);
  });
});

describe("statsOf", () => {
  it("counts deploys, days, lead time, outcomes and changes inside the range", () => {
    const stats = statsOf(
      [
        deploy({
          id: "clean",
          finishedAt: at(9, 5, 10),
          leadTimesHours: [2, 30],
          changes: {
            items: [change("feature", 1), change("feature", 2), change("fix", 3)],
            internalCount: 4,
          },
        }),
        deploy({ id: "same-day", finishedAt: at(9, 5, 16), leadTimesHours: [100] }),
        deploy({ id: "hotfix", finishedAt: at(9, 12), hotfixAt: at(9, 13), leadTimesHours: [200] }),
        deploy({ id: "watching", finishedAt: new Date(now.getTime() - 5 * HOUR) }),
        deploy({ id: "late", finishedAt: at(9, 20), leadTimesHours: [800] }),
        deploy({ id: "outside", finishedAt: at(8, 30), leadTimesHours: [1] }),
      ],
      october,
      now,
    );

    expect(stats.days).toBe(30);
    expect(stats.deploys).toBe(5);
    expect(stats.releaseDays).toBe(4);
    expect(stats.commits).toBe(6);
    expect(stats.leadTime?.p50).toBe(65);
    expect(stats.leadTime?.p85).toBeCloseTo(350);
    expect(stats.leadTimeBins).toEqual([1, 1, 1, 1, 1, 0, 1]);
    expect(stats.failure).toEqual({ failed: 1, clean: 3, watching: 1 });
    expect(decidedOf(stats.failure)).toBe(4);
    expect(failureRate(stats.failure)).toBeCloseTo(1 / 4);
    expect(stats.features).toBe(6);
    expect(stats.fixes).toBe(1);
    expect(perWeek(stats)).toBeCloseTo((5 / 30) * 7);
  });

  it("has no rate and no lead time without finished deploys", () => {
    const watching = deploy({
      id: "w",
      finishedAt: new Date(now.getTime() - HOUR),
      leadTimesHours: [],
    });
    expect(outcomeOf(watching, now).kind).toBe("watching");
    const stats = statsOf([watching], october, now);
    expect(failureRate(stats.failure)).toBeNull();
    expect(stats.leadTime).toBeNull();
    expect(perWeek(statsOf([], { start: now, end: now }, now))).toBe(0);
  });
});

describe("buildPeriodReport", () => {
  const history: DeployHistory = {
    since: new Date(2026, 6, 15),
    deploys: [
      deploy({ id: "july", finishedAt: at(6, 20) }),
      deploy({ id: "web", service: "belture-frontend", finishedAt: at(7, 5) }),
      deploy({ id: "api", finishedAt: at(7, 4) }),
      deploy({ id: "staging", environment: "staging", finishedAt: at(7, 6) }),
    ],
  };
  const filters: PeriodFilters = {
    preset: "custom",
    from: "2026-08-01",
    to: "2026-08-16",
    groupBy: "week",
  };

  it("buckets the range and the period just before it", () => {
    const report = buildPeriodReport(history, filters, "production", now);
    expect(report.range).toEqual({ start: new Date(2026, 7, 1), end: new Date(2026, 7, 17) });
    expect(report.previous).toEqual({ start: new Date(2026, 6, 16), end: new Date(2026, 7, 1) });
    expect(report.buckets.map((bucket) => bucket.deploys)).toEqual([0, 2, 0]);
    expect(report.previousBuckets.map((bucket) => bucket.deploys)).toEqual([0, 1, 0]);
    expect(report.before?.deploys).toBe(1);
    expect(report.outcomes.map((outcome) => [outcome.deploy.id, outcome.verdict.kind])).toEqual([
      ["api", "clean"],
      ["web", "clean"],
    ]);
  });

  it("keeps to one environment", () => {
    expect(buildPeriodReport(history, filters, "staging", now).current.deploys).toBe(1);
  });

  it("marks buckets before the history and drops a previous period it cannot cover", () => {
    const report = buildPeriodReport(
      { ...history, since: new Date(2026, 7, 5) },
      filters,
      "production",
      now,
    );
    expect(report.buckets.map((bucket) => bucket.available)).toEqual([false, true, true]);
    expect(report.before).toBeNull();
  });
});
