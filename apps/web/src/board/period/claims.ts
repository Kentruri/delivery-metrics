import { formatHours, formatShare } from "../format";
import { WINDOW_HOURS } from "../verdict";
import type { PeriodFilters, PeriodReport, PeriodStats } from "./model";
import { countDays, PRESETS } from "./range";
import { decidedOf, failureRate, perWeek } from "./stats";

export type Claim = { text: string; strong?: boolean }[];

const PREVIOUS_PHRASE = {
  "this-month": "last month",
  "last-month": "the month before",
  "last-3-months": "the 3 months before",
  "last-6-months": "the 6 months before",
  "this-year": "the same days last year",
  "last-12-months": "the 12 months before",
} as const;

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const previousPhrase = (filters: PeriodFilters, report: PeriodReport) =>
  filters.preset === "custom"
    ? `the ${countDays(report.previous)} days before`
    : PREVIOUS_PHRASE[filters.preset];

export const currentLabel = (filters: PeriodFilters) =>
  filters.preset === "custom" ? "Selected range" : PRESETS[filters.preset].label;

const frequency = (stats: PeriodStats) => {
  const weekly = perWeek(stats);
  if (weekly >= 1) {
    return `about ${Math.round(weekly)} a week`;
  }
  const monthly = Math.round((weekly / 7) * 30.44);
  return monthly >= 1 ? `about ${monthly} a month` : "less than one a month";
};

export const cadenceClaim = ({ current, before }: PeriodReport, phrase: string): Claim => {
  let comparison = `no data for ${phrase}`;
  if (before) {
    const difference = current.deploys - before.deploys;
    comparison =
      difference === 0
        ? `as many as ${phrase}`
        : `${Math.abs(difference)} ${difference > 0 ? "more" : "fewer"} than ${phrase} (${before.deploys})`;
  }
  return [
    { text: plural(current.deploys, "deploy"), strong: true },
    {
      text: ` on ${plural(current.releaseDays, "day")}, ${frequency(current)}: ${comparison}.`,
    },
  ];
};

export const leadTimeClaim = ({ current, before }: PeriodReport, phrase: string): Claim => {
  const lead = current.leadTime;
  if (!lead) {
    return [{ text: "No changes", strong: true }, { text: " reached production in this range." }];
  }
  const earlier = before?.leadTime;
  let comparison = `no data for ${phrase}`;
  if (earlier) {
    const difference = lead.p50 - earlier.p50;
    comparison =
      Math.abs(difference) < 1
        ? `about as fast as ${phrase}`
        : `${formatHours(Math.abs(difference))} ${difference < 0 ? "faster" : "slower"} than ${phrase} (${formatHours(earlier.p50)})`;
  }
  return [
    { text: "Half of the changes reached production " },
    { text: `within ${formatHours(lead.p50)}`, strong: true },
    { text: `, and 85% within ${formatHours(lead.p85)}: ${comparison}.` },
  ];
};

export const failureClaim = ({ current, before }: PeriodReport, phrase: string): Claim => {
  const { failure } = current;
  const rate = failureRate(failure);
  if (rate === null) {
    return [
      { text: "No finished watch yet", strong: true },
      {
        text: `: ${plural(failure.watching, "deploy is", "deploys are")} still in ${failure.watching === 1 ? "its" : "their"} ${WINDOW_HOURS}-hour watch.`,
      },
    ];
  }

  let comparison = `no data for ${phrase}`;
  if (before) {
    const decided = decidedOf(before.failure);
    if (decided > 0) {
      comparison = `against ${before.failure.failed} of ${decided} ${phrase}`;
    } else {
      comparison = before.deploys === 0 ? `no deploys ${phrase}` : `no finished watch ${phrase}`;
    }
  }
  const decided = decidedOf(failure);
  return failure.failed === 0
    ? [
        { text: "No deploy failed", strong: true },
        { text: ` out of ${decided} with a finished watch; ${comparison}.` },
      ]
    : [
        { text: `${failure.failed} of ${decided} deploys failed`, strong: true },
        { text: ` (${formatShare(rate)}); ${comparison}.` },
      ];
};

export const shippedClaim = ({ current, before }: PeriodReport, phrase: string): Claim => [
  {
    text: `${plural(current.features, "feature")} and ${plural(current.fixes, "fix", "fixes")}`,
    strong: true,
  },
  {
    text: before
      ? ` shipped, against ${before.features} and ${before.fixes} ${phrase}.`
      : ` shipped; no data for ${phrase}.`,
  },
];

export const productionOnlyClaim = (metric: string): Claim => [
  { text: metric, strong: true },
  { text: " is measured on production deploys only." },
];
