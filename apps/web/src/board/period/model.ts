import type { DeployView, Verdict } from "../model";

export type GroupBy = "week" | "month" | "year";

export type RangePreset =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "last-12-months"
  | "custom";

export interface PeriodFilters {
  preset: RangePreset;
  from: string;
  to: string;
  groupBy: GroupBy;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Counted deploys of one environment; release bumps, redeploys and failed builds stay out.
export type HistoryDeploy = DeployView;

export interface DeployHistory {
  since: Date;
  deploys: HistoryDeploy[];
}

export interface FailureCount {
  failed: number;
  clean: number;
  watching: number;
}

export interface LeadTime {
  p50: number;
  p85: number;
}

export interface PeriodStats {
  days: number;
  deploys: number;
  releaseDays: number;
  commits: number;
  leadTime: LeadTime | null;
  leadTimeBins: number[];
  failure: FailureCount;
  features: number;
  fixes: number;
}

export interface PeriodBucket extends PeriodStats, DateRange {
  available: boolean;
}

export interface Outcome {
  deploy: HistoryDeploy;
  verdict: Verdict;
}

export interface PeriodReport {
  range: DateRange;
  previous: DateRange;
  groupBy: GroupBy;
  buckets: PeriodBucket[];
  previousBuckets: PeriodBucket[];
  current: PeriodStats;
  before: PeriodStats | null;
  outcomes: Outcome[];
}
