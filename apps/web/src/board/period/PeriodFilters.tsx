import { DateField, SegmentedControl, SelectField } from "../controls";
import type { GroupBy } from "./model";
import { GROUPINGS, RANGE_OPTIONS } from "./range";
import type { PeriodComparison } from "./usePeriodComparison";

export type PeriodView = "chart" | "table";

const GROUP_LABEL: Record<GroupBy, string> = { week: "Week", month: "Month", year: "Year" };

const VIEW_OPTIONS: { value: PeriodView; label: string }[] = [
  { value: "chart", label: "Chart" },
  { value: "table", label: "Table" },
];

interface PeriodFiltersProps {
  period: PeriodComparison;
  view: PeriodView;
  onView: (view: PeriodView) => void;
}

export const PeriodFilters = ({ period, view, onView }: PeriodFiltersProps) => {
  const { filters } = period;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <SelectField
        label="Range"
        options={RANGE_OPTIONS}
        value={filters.preset}
        onChange={period.choosePreset}
      />
      {filters.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <DateField
            label="From"
            value={filters.from}
            min={period.minDay}
            max={period.maxDay}
            onChange={period.chooseFrom}
          />
          <DateField
            label="To"
            value={filters.to}
            min={period.minDay}
            max={period.maxDay}
            onChange={period.chooseTo}
          />
        </div>
      )}
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span aria-hidden>By</span>
        <SegmentedControl
          legend="Group by"
          name="group-by"
          options={GROUPINGS.map((value) => ({
            value,
            label: GROUP_LABEL[value],
            disabled: !period.groupings.includes(value),
          }))}
          value={filters.groupBy}
          onChange={period.chooseGroupBy}
        />
      </div>
      <div className="sm:ml-auto">
        <SegmentedControl
          legend="Show as"
          name="period-view"
          options={VIEW_OPTIONS}
          value={view}
          onChange={onView}
        />
      </div>
    </div>
  );
};
