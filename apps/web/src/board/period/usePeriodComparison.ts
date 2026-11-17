import { useMemo, useState } from "react";
import type { DeployHistory, GroupBy, PeriodFilters, RangePreset } from "./model";
import {
  allowedGroupings,
  fittingGrouping,
  lastDayOf,
  PRESETS,
  parseDay,
  resolveRanges,
  startOfDay,
  toDayValue,
} from "./range";
import { buildPeriodReport } from "./stats";

const DEFAULT_PRESET = "last-3-months";

const initialFilters = (now: Date): PeriodFilters => {
  const range = PRESETS[DEFAULT_PRESET].range(now);
  return {
    preset: DEFAULT_PRESET,
    from: toDayValue(range.start),
    to: toDayValue(lastDayOf(range)),
    groupBy: fittingGrouping(range, PRESETS[DEFAULT_PRESET].groupBy),
  };
};

export const usePeriodComparison = (history: DeployHistory, environment: string, now: Date) => {
  const [filters, setFilters] = useState(() => initialFilters(now));
  const report = useMemo(
    () => buildPeriodReport(history, filters, environment, now),
    [history, filters, environment, now],
  );

  const regroup = (next: PeriodFilters, preferred: GroupBy): PeriodFilters => ({
    ...next,
    groupBy: fittingGrouping(resolveRanges(next, now).range, preferred),
  });

  const chooseDay = (field: "from" | "to") => (value: string) => {
    if (parseDay(value)) {
      setFilters((current) => regroup({ ...current, [field]: value }, current.groupBy));
    }
  };

  return {
    filters,
    report,
    groupings: allowedGroupings(report.range),
    minDay: toDayValue(history.since),
    maxDay: toDayValue(startOfDay(now)),
    choosePreset: (preset: RangePreset) =>
      setFilters((current) => {
        if (preset !== "custom") {
          return regroup({ ...current, preset }, PRESETS[preset].groupBy);
        }
        const shown = resolveRanges(current, now).range;
        return regroup(
          { ...current, preset, from: toDayValue(shown.start), to: toDayValue(lastDayOf(shown)) },
          current.groupBy,
        );
      }),
    chooseFrom: chooseDay("from"),
    chooseTo: chooseDay("to"),
    chooseGroupBy: (groupBy: GroupBy) => setFilters((current) => ({ ...current, groupBy })),
  };
};

export type PeriodComparison = ReturnType<typeof usePeriodComparison>;
