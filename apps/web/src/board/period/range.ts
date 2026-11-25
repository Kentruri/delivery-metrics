import type { DateRange, GroupBy, PeriodFilters, RangePreset } from "./model";

const DAY_MS = 86_400_000;
const MAX_BUCKETS = 60;
const COMFORTABLE_BUCKETS = 26;

export const GROUPINGS: GroupBy[] = ["week", "month", "year"];

// Average length of a full bucket, to turn the previous period into a per-bucket rate.
export const UNIT_DAYS: Record<GroupBy, number> = { week: 7, month: 30.44, year: 365.25 };
export const UNIT_MAX_DAYS: Record<GroupBy, number> = { week: 7, month: 31, year: 366 };

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
};

const startOfWeek = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const UNIT = {
  week: { start: startOfWeek, next: (date: Date) => addDays(date, 7) },
  month: { start: startOfMonth, next: (date: Date) => addMonths(date, 1) },
  year: { start: startOfYear, next: (date: Date) => addMonths(date, 12) },
} as const;

type FixedPreset = Exclude<RangePreset, "custom">;

interface Preset {
  label: string;
  months: number;
  groupBy: GroupBy;
  range: (now: Date) => DateRange;
}

export const PRESETS: Record<FixedPreset, Preset> = {
  "this-month": {
    label: "This month",
    months: 1,
    groupBy: "week",
    range: (now) => ({ start: startOfMonth(now), end: now }),
  },
  "last-month": {
    label: "Last month",
    months: 1,
    groupBy: "week",
    range: (now) => ({ start: addMonths(startOfMonth(now), -1), end: startOfMonth(now) }),
  },
  "last-3-months": {
    label: "Last 3 months",
    months: 3,
    groupBy: "week",
    range: (now) => ({ start: addMonths(startOfMonth(now), -2), end: now }),
  },
  "last-6-months": {
    label: "Last 6 months",
    months: 6,
    groupBy: "month",
    range: (now) => ({ start: addMonths(startOfMonth(now), -5), end: now }),
  },
  "this-year": {
    label: "This year",
    months: 12,
    groupBy: "month",
    range: (now) => ({ start: startOfYear(now), end: now }),
  },
  "last-12-months": {
    label: "Last 12 months",
    months: 12,
    groupBy: "month",
    range: (now) => ({ start: addMonths(startOfMonth(now), -11), end: now }),
  },
};

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  ...(Object.keys(PRESETS) as FixedPreset[]).map((value) => ({
    value,
    label: PRESETS[value].label,
  })),
  { value: "custom", label: "Custom range" },
];

export const toDayValue = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");

export const parseDay = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const lastDayOf = (range: DateRange) => startOfDay(new Date(range.end.getTime() - 1));

export const resolveRanges = (
  filters: Pick<PeriodFilters, "preset" | "from" | "to">,
  now: Date,
): { range: DateRange; previous: DateRange } => {
  if (filters.preset !== "custom") {
    const preset = PRESETS[filters.preset];
    const range = preset.range(now);
    return {
      range,
      previous: {
        start: addMonths(range.start, -preset.months),
        end: addMonths(range.end, -preset.months),
      },
    };
  }

  const today = startOfDay(now);
  const day = (value: string) => {
    const parsed = parseDay(value) ?? today;
    return parsed.getTime() > today.getTime() ? today : parsed;
  };
  const first = day(filters.from);
  const last = day(filters.to);
  const [from, to] = first.getTime() <= last.getTime() ? [first, last] : [last, first];
  const after = addDays(to, 1);
  const days = Math.round((after.getTime() - from.getTime()) / DAY_MS);
  return {
    range: { start: from, end: new Date(Math.min(after.getTime(), now.getTime())) },
    previous: { start: addDays(from, -days), end: from },
  };
};

export const bucketRanges = (range: DateRange, groupBy: GroupBy): DateRange[] => {
  const unit = UNIT[groupBy];
  const buckets: DateRange[] = [];
  for (
    let cursor = unit.start(range.start);
    cursor.getTime() < range.end.getTime();
    cursor = unit.next(cursor)
  ) {
    const next = unit.next(cursor);
    buckets.push({
      start: cursor.getTime() < range.start.getTime() ? range.start : cursor,
      end: next.getTime() > range.end.getTime() ? range.end : next,
    });
  }
  return buckets;
};

export const allowedGroupings = (range: DateRange): GroupBy[] =>
  GROUPINGS.filter((groupBy) => {
    const count = bucketRanges(range, groupBy).length;
    return count <= MAX_BUCKETS && (count >= 2 || groupBy === "week");
  });

export const fittingGrouping = (range: DateRange, preferred: GroupBy): GroupBy => {
  const allowed = allowedGroupings(range);
  if (allowed.includes(preferred)) {
    return preferred;
  }
  return (
    allowed.find((groupBy) => bucketRanges(range, groupBy).length <= COMFORTABLE_BUCKETS) ??
    allowed[allowed.length - 1] ??
    "year"
  );
};

export const countDays = (range: DateRange) => {
  let days = 0;
  for (
    let day = startOfDay(range.start);
    day.getTime() < range.end.getTime();
    day = addDays(day, 1)
  ) {
    days += 1;
  }
  return days;
};

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const fullDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short" });
const longMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export const formatRange = (range: DateRange) => {
  const first = range.start;
  const last = lastDayOf(range);
  if (first.toDateString() === last.toDateString()) {
    return fullDay.format(first);
  }
  if (first.getFullYear() !== last.getFullYear()) {
    return `${fullDay.format(first)} – ${fullDay.format(last)}`;
  }
  if (first.getMonth() !== last.getMonth()) {
    return `${dayMonth.format(first)} – ${fullDay.format(last)}`;
  }
  return `${first.getDate()} – ${fullDay.format(last)}`;
};

const isWhole = (bucket: DateRange, groupBy: GroupBy) => {
  const start = UNIT[groupBy].start(bucket.start);
  return (
    start.getTime() === bucket.start.getTime() &&
    UNIT[groupBy].next(start).getTime() === bucket.end.getTime()
  );
};

export const bucketTitle = (bucket: DateRange, groupBy: GroupBy) => {
  if (groupBy !== "week" && isWhole(bucket, groupBy)) {
    return groupBy === "month"
      ? longMonth.format(bucket.start)
      : String(bucket.start.getFullYear());
  }
  return formatRange(bucket);
};

export const bucketLabel = (bucket: DateRange, groupBy: GroupBy, index: number) => {
  if (groupBy === "week") {
    return dayMonth.format(bucket.start);
  }
  if (groupBy === "year") {
    return String(bucket.start.getFullYear());
  }
  const month = shortMonth.format(bucket.start);
  return index === 0 || bucket.start.getMonth() === 0
    ? `${month} ${bucket.start.getFullYear()}`
    : month;
};
