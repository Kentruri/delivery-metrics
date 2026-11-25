import { FAILURE_RULE } from "@cloudnonic/delivery-contracts";
import { CaretRight } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { capitalize, currentLabel, previousPhrase } from "./claims";
import type { DeployHistory } from "./model";
import { PeriodFilters, type PeriodView } from "./PeriodFilters";
import { PeriodRows } from "./PeriodRows";
import { PeriodTable } from "./PeriodTable";
import { formatRange } from "./range";
import { usePeriodComparison } from "./usePeriodComparison";

const RULES = [
  {
    term: "Every chart",
    rule: "puts this period, in navy, next to the previous one of the same length, in grey.",
  },
  {
    term: "A deploy",
    rule: "is a push that Netlify or Forge put live. release-please version bumps and redeploys of the same commit are not counted.",
  },
  {
    term: "Lead time",
    rule: "runs from a commit's author time to the first production deploy that contains it.",
  },
  { term: "A release day", rule: "is a day with at least one production deploy." },
  { term: "Failure:", rule: FAILURE_RULE },
  {
    term: "Features and fixes",
    rule: "come from the title of each pull request (feat: or fix:) and its Linear ticket in the branch name; refactors, chores, CI and tooling are counted apart.",
  },
  {
    term: "Weeks and months cut by the range",
    rule: "only count their days inside it.",
  },
];

interface PeriodSectionProps {
  history: DeployHistory;
  environment: string;
  now: Date;
  actions?: ReactNode;
}

export const PeriodSection = ({ history, environment, now, actions }: PeriodSectionProps) => {
  const period = usePeriodComparison(history, environment, now);
  const [view, setView] = useState<PeriodView>("chart");
  const { report, filters } = period;
  const production = environment === "production";
  const empty =
    report.current.deploys === 0 && report.buckets.some((candidate) => candidate.available);

  const body = () => {
    if (empty) {
      return (
        <div className="px-5 py-8">
          <p className="font-semibold text-ink">Nothing shipped to {environment} in this range.</p>
          <p className="mt-1 text-[14px] text-body">
            Pick a longer range; new deploys show up after each daily sync.
          </p>
        </div>
      );
    }
    return view === "chart" ? (
      <PeriodRows report={report} filters={filters} production={production} />
    ) : (
      <PeriodTable report={report} production={production} />
    );
  };

  return (
    <section aria-labelledby="period-heading" className="mt-12">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="period-heading" className="text-[15px] font-semibold text-ink">
          By period
        </h2>
        {actions}
      </div>
      <PeriodFilters period={period} view={view} onView={setView} />

      <div className="mt-4 rounded-panel border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-5 py-3">
          <p className="text-[15px] font-semibold text-ink">
            {currentLabel(filters)}{" "}
            <span className="font-normal text-muted tabular-nums">
              {formatRange(report.range)}, by {report.groupBy}
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[2px] bg-ink" />
              This period
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[2px] bg-previous" />
              {capitalize(previousPhrase(filters, report))}, {formatRange(report.previous)}
            </span>
          </p>
        </div>
        {body()}
      </div>

      <details className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-inset text-[13px] text-muted transition-colors duration-150 ease-out hover:text-ink [&::-webkit-details-marker]:hidden">
          <CaretRight
            size={14}
            weight="bold"
            aria-hidden
            className="group-open:rotate-90 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
          />
          How we count
        </summary>
        <div className="mt-2 space-y-2 pl-[22px] text-[13px] leading-relaxed text-muted">
          {RULES.map(({ term, rule }) => (
            <p key={term}>
              <span className="font-semibold text-body">{term}</span> {rule}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
};
