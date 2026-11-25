import { percentile } from "@cloudnonic/delivery-contracts";
import { verdictOf } from "../verdict";
import type {
  DateRange,
  DeployHistory,
  FailureCount,
  HistoryDeploy,
  PeriodBucket,
  PeriodFilters,
  PeriodReport,
  PeriodStats,
} from "./model";
import { bucketRanges, countDays, resolveRanges } from "./range";

export const LEAD_TIME_BINS = [
  { label: "< 4 h", short: "< 4 h", below: 4 },
  { label: "4–24 h", short: "4–24 h", below: 24 },
  { label: "1–3 days", short: "1–3 d", below: 72 },
  { label: "3–7 days", short: "3–7 d", below: 168 },
  { label: "1–2 weeks", short: "1–2 w", below: 336 },
  { label: "2–4 weeks", short: "2–4 w", below: 672 },
  { label: "4+ weeks", short: "4+ w", below: Number.POSITIVE_INFINITY },
];

export { percentile };

export const outcomeOf = (deploy: HistoryDeploy, now: Date) => verdictOf(deploy, now);

const within = (deploys: HistoryDeploy[], range: DateRange) =>
  deploys.filter(
    (deploy) =>
      deploy.finishedAt.getTime() >= range.start.getTime() &&
      deploy.finishedAt.getTime() < range.end.getTime(),
  );

const binsOf = (hours: number[]) => {
  const bins = LEAD_TIME_BINS.map(() => 0);
  for (const value of hours) {
    const index = LEAD_TIME_BINS.findIndex((bin) => value < bin.below);
    bins[index] = (bins[index] ?? 0) + 1;
  }
  return bins;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const kinds = (deploy: HistoryDeploy, kind: "feature" | "fix") =>
  deploy.changes.items.filter((item) => item.kind === kind).length;

export const decidedOf = (failure: FailureCount) => failure.failed + failure.clean;

export const failureRate = (failure: FailureCount) => {
  const decided = decidedOf(failure);
  return decided > 0 ? failure.failed / decided : null;
};

export const perWeek = (stats: PeriodStats) =>
  stats.days > 0 ? (stats.deploys / stats.days) * 7 : 0;

export const statsOf = (deploys: HistoryDeploy[], range: DateRange, now: Date): PeriodStats => {
  const inRange = within(deploys, range);
  const hours = inRange.flatMap((deploy) => deploy.leadTimesHours).sort((a, b) => a - b);
  const failure: FailureCount = { failed: 0, clean: 0, watching: 0 };
  for (const deploy of inRange) {
    const { kind } = outcomeOf(deploy, now);
    if (kind === "failed" || kind === "clean" || kind === "watching") {
      failure[kind] += 1;
    }
  }
  return {
    days: countDays({
      start: range.start,
      end: new Date(Math.min(range.end.getTime(), now.getTime())),
    }),
    deploys: inRange.length,
    releaseDays: new Set(inRange.map((deploy) => deploy.finishedAt.toDateString())).size,
    commits: hours.length,
    leadTime:
      hours.length === 0 ? null : { p50: percentile(hours, 0.5), p85: percentile(hours, 0.85) },
    leadTimeBins: binsOf(hours),
    failure,
    features: sum(inRange.map((deploy) => kinds(deploy, "feature"))),
    fixes: sum(inRange.map((deploy) => kinds(deploy, "fix"))),
  };
};

export const buildPeriodReport = (
  history: DeployHistory,
  filters: PeriodFilters,
  environment: string,
  now: Date,
): PeriodReport => {
  const { range, previous } = resolveRanges(filters, now);
  const deploys = history.deploys.filter((deploy) => deploy.environment === environment);
  const since = history.since.getTime();
  const bucketsOf = (span: DateRange): PeriodBucket[] =>
    bucketRanges(span, filters.groupBy).map((bucket) => ({
      ...bucket,
      ...statsOf(deploys, bucket, now),
      available: bucket.end.getTime() > since,
    }));

  return {
    range,
    previous,
    groupBy: filters.groupBy,
    buckets: bucketsOf(range),
    previousBuckets: bucketsOf(previous),
    current: statsOf(deploys, range, now),
    before: previous.start.getTime() >= since ? statsOf(deploys, previous, now) : null,
    outcomes: within(deploys, range)
      .sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime())
      .map((deploy) => ({ deploy, verdict: outcomeOf(deploy, now) })),
  };
};
