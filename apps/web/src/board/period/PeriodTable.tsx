import { formatHours, formatShare } from "../format";
import type { GroupBy, PeriodReport, PeriodStats } from "./model";
import { bucketTitle, formatRange } from "./range";
import { decidedOf, failureRate } from "./stats";

const UNIT_TITLE: Record<GroupBy, string> = { week: "Week", month: "Month", year: "Year" };
const HEAD = "px-3 py-2 text-right font-normal";
const CELL = "px-3 py-2 text-right tabular-nums";
const LABEL = "px-5 py-2 text-left font-normal";

const leadTimeCells = (stats: PeriodStats, production: boolean): [string, string] => {
  if (!production) {
    return ["Production only", "Production only"];
  }
  return stats.leadTime
    ? [formatHours(stats.leadTime.p50), formatHours(stats.leadTime.p85)]
    : ["No deploys", "No deploys"];
};

const failureCell = (stats: PeriodStats, production: boolean) => {
  if (!production) {
    return "Production only";
  }
  const rate = failureRate(stats.failure);
  if (rate !== null) {
    return `${stats.failure.failed} of ${decidedOf(stats.failure)} (${formatShare(rate)})`;
  }
  return stats.deploys === 0 ? "No deploys" : "Still watching";
};

const Cells = ({ stats, production }: { stats: PeriodStats | null; production: boolean }) => {
  if (!stats) {
    return (
      <td colSpan={7} className="px-5 py-2 text-right text-muted">
        No data
      </td>
    );
  }
  const [median, upper] = leadTimeCells(stats, production);
  return (
    <>
      <td className={CELL}>{stats.deploys}</td>
      <td className={CELL}>
        {stats.releaseDays} of {stats.days}
      </td>
      <td className={CELL}>{median}</td>
      <td className={CELL}>{upper}</td>
      <td className={CELL}>{failureCell(stats, production)}</td>
      <td className={CELL}>{stats.features}</td>
      <td className={`${CELL} pr-5`}>{stats.fixes}</td>
    </>
  );
};

export const PeriodTable = ({
  report,
  production,
}: {
  report: PeriodReport;
  production: boolean;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[52rem] text-[13px] text-body">
      <caption className="sr-only">
        Deploys, release days, lead time, failed deploys, features and fixes by {report.groupBy},{" "}
        {formatRange(report.range)}
      </caption>
      <thead>
        <tr className="border-b border-line text-[12px] text-muted">
          <th scope="col" className={LABEL}>
            {UNIT_TITLE[report.groupBy]}
          </th>
          <th scope="col" className={HEAD}>
            Deploys
          </th>
          <th scope="col" className={HEAD}>
            {production ? "Release days" : "Days with a deploy"}
          </th>
          <th scope="col" className={HEAD}>
            Lead time, median
          </th>
          <th scope="col" className={HEAD}>
            85th percentile
          </th>
          <th scope="col" className={HEAD}>
            Failed
          </th>
          <th scope="col" className={HEAD}>
            Features
          </th>
          <th scope="col" className={`${HEAD} pr-5`}>
            Fixes
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {report.buckets.map((bucket) => (
          <tr key={bucket.start.getTime()}>
            <th scope="row" className={LABEL}>
              {bucketTitle(bucket, report.groupBy)}
            </th>
            <Cells stats={bucket.available ? bucket : null} production={production} />
          </tr>
        ))}
      </tbody>
      <tfoot className="border-t border-line-strong">
        <tr className="font-semibold text-ink">
          <th scope="row" className={`${LABEL} font-semibold`}>
            {formatRange(report.range)}
          </th>
          <Cells stats={report.current} production={production} />
        </tr>
        <tr className="text-muted">
          <th scope="row" className={LABEL}>
            {formatRange(report.previous)}
          </th>
          <Cells stats={report.before} production={production} />
        </tr>
      </tfoot>
    </table>
  </div>
);
