import { describe, expect, it } from "vitest";
import { verdictOf, WATCH_MS } from "./verdict";

const HOUR = 3_600_000;
const finishedAt = new Date(2026, 9, 26, 12, 0);
const hours = (count: number) => new Date(finishedAt.getTime() + count * HOUR);

const deploy = {
  status: "succeeded" as const,
  environment: "production" as const,
  finishedAt,
};

describe("verdictOf", () => {
  it("watches a production deploy for 72 hours, then calls it clean", () => {
    expect(WATCH_MS).toBe(72 * HOUR);
    expect(verdictOf(deploy, hours(10))).toEqual({ kind: "watching", msLeft: 62 * HOUR });
    expect(verdictOf(deploy, hours(80))).toEqual({ kind: "clean" });
  });

  it("fails a deploy followed by a hotfix or a rollback inside the window", () => {
    expect(verdictOf({ ...deploy, hotfixAt: hours(48) }, hours(50))).toEqual({
      kind: "failed",
      reason: "hotfix",
      at: hours(48),
    });
    expect(verdictOf({ ...deploy, hotfixAt: hours(5), rollbackAt: hours(3) }, hours(6))).toEqual({
      kind: "failed",
      reason: "rollback",
      at: hours(3),
    });
    expect(verdictOf({ ...deploy, hotfixAt: hours(80) }, hours(90))).toEqual({ kind: "clean" });
  });

  it("does not watch other environments or builds that never went live", () => {
    expect(verdictOf({ ...deploy, environment: "staging" }, hours(1))).toEqual({
      kind: "deployed",
    });
    expect(verdictOf({ ...deploy, status: "failed" }, hours(1))).toEqual({ kind: "build-failed" });
  });
});
