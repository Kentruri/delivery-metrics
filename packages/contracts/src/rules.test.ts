import { describe, expect, it } from "vitest";
import { outcomeAt, percentile, WINDOW_HOURS } from "./rules.js";

const HOUR = 3_600_000;
const finishedAt = Date.UTC(2026, 9, 26, 12);
const hours = (count: number) => finishedAt + count * HOUR;

describe("outcomeAt", () => {
  it("watches a deploy while its window is open", () => {
    expect(outcomeAt({ finishedAt, hotfixAt: null, rollbackAt: null }, hours(10))).toEqual({
      kind: "watching",
      msLeft: (WINDOW_HOURS - 10) * HOUR,
    });
  });

  it("calls a deploy clean once the window closes", () => {
    expect(outcomeAt({ finishedAt, hotfixAt: null, rollbackAt: null }, hours(80))).toEqual({
      kind: "clean",
    });
  });

  it("fails a deploy on a hotfix or a rollback inside the window, rollback first", () => {
    expect(outcomeAt({ finishedAt, hotfixAt: hours(48), rollbackAt: null }, hours(50))).toEqual({
      kind: "failed",
      reason: "hotfix",
      at: hours(48),
    });
    expect(outcomeAt({ finishedAt, hotfixAt: hours(5), rollbackAt: hours(3) }, hours(6))).toEqual({
      kind: "failed",
      reason: "rollback",
      at: hours(3),
    });
  });

  it("ignores a hotfix after the window, and honours a custom window", () => {
    expect(outcomeAt({ finishedAt, hotfixAt: hours(80), rollbackAt: null }, hours(90))).toEqual({
      kind: "clean",
    });
    expect(outcomeAt({ finishedAt, hotfixAt: hours(30), rollbackAt: null }, hours(40), 24)).toEqual(
      { kind: "clean" },
    );
  });
});

describe("percentile", () => {
  it("interpolates between the closest ranks", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0.85)).toBeCloseTo(3.55);
    expect(percentile([7], 0.85)).toBe(7);
    expect(percentile([], 0.5)).toBe(0);
  });
});
