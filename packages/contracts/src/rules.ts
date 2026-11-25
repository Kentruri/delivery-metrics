const HOUR_MS = 3_600_000;

export const WINDOW_HOURS = 72;

export const FAILURE_RULE =
  "A production deploy fails when, within 72 hours, it gets a hotfix (a pull request merged straight into main) or a rollback (a revert, or an older version deployed again).";

export type Outcome =
  | { kind: "watching"; msLeft: number }
  | { kind: "clean" }
  | { kind: "failed"; reason: "hotfix" | "rollback"; at: number };

export interface WatchedTimes {
  finishedAt: number;
  hotfixAt: number | null;
  rollbackAt: number | null;
}

export const outcomeAt = (
  { finishedAt, hotfixAt, rollbackAt }: WatchedTimes,
  now: number,
  windowHours = WINDOW_HOURS,
): Outcome => {
  const end = finishedAt + windowHours * HOUR_MS;
  if (rollbackAt !== null && rollbackAt <= end) {
    return { kind: "failed", reason: "rollback", at: rollbackAt };
  }
  if (hotfixAt !== null && hotfixAt <= end) {
    return { kind: "failed", reason: "hotfix", at: hotfixAt };
  }
  const msLeft = end - now;
  return msLeft > 0 ? { kind: "watching", msLeft } : { kind: "clean" };
};

// Linear interpolation between the closest ranks, on an ascending list.
export const percentile = (sorted: number[], share: number): number => {
  const position = (sorted.length - 1) * share;
  const lower = sorted[Math.floor(position)] ?? 0;
  const upper = sorted[Math.ceil(position)] ?? lower;
  return lower + (upper - lower) * (position - Math.floor(position));
};
