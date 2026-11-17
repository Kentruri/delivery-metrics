import { CheckCircle, Eye, WarningCircle } from "@phosphor-icons/react";
import { Fragment, type KeyboardEvent, useState } from "react";
import { formatDecimal, formatShare, formatSpan } from "../format";
import type { Verdict } from "../model";
import {
  columnPath,
  HatchPattern,
  niceCeiling,
  Tooltip,
  useMeasuredWidth,
  usePatternId,
} from "./chartKit";
import type { HistoryDeploy, PeriodReport, PeriodStats } from "./model";
import { bucketLabel, bucketRanges, bucketTitle, formatRange, UNIT_DAYS } from "./range";
import { LEAD_TIME_BINS } from "./stats";

const CHAR_WIDTH = 6.5;
const STEP: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

interface CadenceProps {
  report: PeriodReport;
  currentLabel: string;
  previousLabel: string;
}

const CADENCE = { top: 16, bottom: 110, dates: 127, groups: 146, height: 152, gutter: 36 };

export const CadenceChart = ({ report, currentLabel, previousLabel }: CadenceProps) => {
  const [ref, width] = useMeasuredWidth();
  const pattern = usePatternId();
  const [active, setActive] = useState<number | null>(null);
  const { previousBuckets: previous, buckets: current, groupBy } = report;
  const all = [...previous, ...current];
  const last = all.length - 1;
  const gap = previous.length > 0 ? 1 : 0;
  const plotWidth = Math.max(0, width - CADENCE.gutter);
  const band = plotWidth / Math.max(1, all.length + gap);
  const bar = Math.max(1, Math.min(20, band * 0.6, band - 2));
  const slotOf = (index: number) => (index < previous.length ? index : index + gap);
  const centreOf = (index: number) => (slotOf(index) + 0.5) * band;
  const max = niceCeiling(
    Math.max(1, ...all.map((bucket) => (bucket.available ? bucket.deploys : 0))) * 1.1,
  );
  const yOf = (value: number) => CADENCE.bottom - (value / max) * (CADENCE.bottom - CADENCE.top);
  const rateOf = (stats: PeriodStats | null) =>
    stats && stats.days > 0 ? (stats.deploys / stats.days) * UNIT_DAYS[groupBy] : null;

  const groups = [
    {
      key: "previous",
      label: previousLabel,
      rate: rateOf(report.before),
      from: 0,
      to: previous.length * band,
      first: 0,
      count: previous.length,
    },
    {
      key: "current",
      label: currentLabel,
      rate: rateOf(report.current),
      from: (previous.length + gap) * band,
      to: plotWidth,
      first: previous.length,
      count: current.length,
    },
  ];

  const labels = all.map((bucket, index) =>
    bucketLabel(bucket, groupBy, index < previous.length ? index : index - previous.length),
  );
  const longest = Math.max(0, ...labels.map((label) => label.length));
  const labelStep = Math.max(1, Math.ceil((longest * CHAR_WIDTH + 10) / Math.max(band, 1)));
  const axisLabels: { key: string; text: string; x: number; index: number }[] = [];
  for (const [position, group] of groups.entries()) {
    const next = groups[position + 1];
    const nextText = next && next.count > 0 ? labels[next.first] : undefined;
    const limit =
      next && nextText
        ? centreOf(next.first) - (nextText.length * CHAR_WIDTH) / 2 - 8
        : Number.POSITIVE_INFINITY;
    let edge = Number.NEGATIVE_INFINITY;
    for (let offset = 0; offset < group.count; offset += labelStep) {
      const index = group.first + offset;
      const text = labels[index] ?? "";
      const half = (text.length * CHAR_WIDTH) / 2;
      const x = centreOf(index);
      if (x - half >= edge + 8 && x + half <= limit) {
        axisLabels.push({ key: `${group.key}-${index}`, text, x, index });
        edge = x + half;
      }
    }
  }

  const describe = (index: number) => {
    const bucket = all[index];
    if (!bucket) {
      return "";
    }
    const title = `${index < previous.length ? `${previousLabel}, ` : ""}${bucketTitle(bucket, groupBy)}`;
    if (!bucket.available) {
      return `${title}: no data`;
    }
    return `${title}: ${plural(bucket.deploys, "deploy")}, ${bucket.releaseDays} of ${bucket.days} days with a release`;
  };

  const pick = (clientX: number, element: HTMLElement) => {
    const x = clientX - element.getBoundingClientRect().left;
    const slot = Math.floor(x / band);
    if (x < 0 || x >= plotWidth || (gap > 0 && slot === previous.length)) {
      setActive(null);
      return;
    }
    setActive(slot < previous.length ? slot : slot - gap);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP[event.key];
    const ends: Record<string, number> = { Home: 0, End: last };
    const target =
      step === undefined ? ends[event.key] : Math.min(last, Math.max(0, (active ?? last) + step));
    if (target !== undefined) {
      event.preventDefault();
      setActive(target);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  const shown = active === null ? undefined : all[active];

  return (
    <div ref={ref} className="relative">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Deploys by ${groupBy}`}
        aria-valuemin={1}
        aria-valuemax={all.length}
        aria-valuenow={(active ?? last) + 1}
        aria-valuetext={describe(active ?? last)}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((value) => value ?? last)}
        onBlur={() => setActive(null)}
        onMouseMove={(event) => pick(event.clientX, event.currentTarget)}
        onMouseLeave={() => setActive(null)}
        className="rounded-inset"
      >
        <svg width={width} height={CADENCE.height} aria-hidden className="block overflow-visible">
          <HatchPattern id={pattern} />
          {active !== null && (
            <rect
              x={slotOf(active) * band}
              y={CADENCE.top - 6}
              width={band}
              height={CADENCE.bottom - CADENCE.top + 6}
              rx="4"
              className="fill-highlight"
            />
          )}
          <line x1="0" x2={plotWidth} y1={CADENCE.top} y2={CADENCE.top} className="stroke-line" />
          {all.map((bucket, index) => {
            const key = `${index < previous.length ? "previous" : "current"}-${bucket.start.getTime()}`;
            return bucket.available ? (
              <path
                key={key}
                d={columnPath(centreOf(index), bar, yOf(bucket.deploys), CADENCE.bottom)}
                className={index < previous.length ? "fill-previous" : "fill-ink"}
              />
            ) : (
              <rect
                key={key}
                x={slotOf(index) * band + 1}
                y={CADENCE.top}
                width={Math.max(1, band - 2)}
                height={CADENCE.bottom - CADENCE.top}
                rx="4"
                fill={`url(#${pattern})`}
              />
            );
          })}
          <line
            x1="0"
            x2={plotWidth}
            y1={CADENCE.bottom}
            y2={CADENCE.bottom}
            className="stroke-line-strong"
          />
          {gap > 0 && (
            <line
              x1={(previous.length + 0.5) * band}
              x2={(previous.length + 0.5) * band}
              y1={CADENCE.top}
              y2={CADENCE.groups - 12}
              className="stroke-line"
            />
          )}
          {groups.map((group) => {
            if (group.rate === null || group.count === 0) {
              return null;
            }
            const y = yOf(group.rate);
            const text = `${formatDecimal(group.rate)} a ${groupBy}`;
            return (
              <g key={group.key}>
                <line
                  x1={group.from + 2}
                  x2={group.to - 2}
                  y1={y}
                  y2={y}
                  strokeWidth="4"
                  className="stroke-panel"
                />
                <line
                  x1={group.from + 2}
                  x2={group.to - 2}
                  y1={y}
                  y2={y}
                  strokeWidth="1.5"
                  className={group.key === "current" ? "stroke-ink" : "stroke-muted"}
                />
                <rect
                  x={group.from + 4}
                  y={y - 8}
                  width={text.length * CHAR_WIDTH + 10}
                  height="16"
                  rx="4"
                  className="fill-panel"
                />
                <text
                  x={group.from + 9}
                  y={y + 4}
                  className={`text-[11px] tabular-nums ${
                    group.key === "current" ? "fill-ink font-semibold" : "fill-muted"
                  }`}
                >
                  {text}
                </text>
              </g>
            );
          })}
          <text
            x={plotWidth + 8}
            y={CADENCE.top + 4}
            className="fill-muted text-[11px] tabular-nums"
          >
            {max}
          </text>
          {axisLabels.map((label) => (
            <text
              key={label.key}
              x={label.x}
              y={CADENCE.dates}
              textAnchor="middle"
              className={`text-[11px] tabular-nums ${
                active === label.index ? "fill-ink font-semibold" : "fill-muted"
              }`}
            >
              {label.text}
            </text>
          ))}
          {groups.map((group) =>
            group.count === 0 ? null : (
              <text
                key={`${group.key}-label`}
                x={(group.from + group.to) / 2}
                y={CADENCE.groups}
                textAnchor="middle"
                className={`text-[12px] ${
                  group.key === "current" ? "fill-ink font-semibold" : "fill-muted"
                }`}
              >
                {group.label}
              </text>
            ),
          )}
        </svg>
      </div>
      {active !== null && shown && (
        <Tooltip x={centreOf(active)} width={width}>
          <p className="font-semibold text-ink">{bucketTitle(shown, groupBy)}</p>
          {active < previous.length && <p className="text-muted">{previousLabel}</p>}
          {shown.available ? (
            <>
              <p>
                <span className="font-semibold text-ink tabular-nums">{shown.deploys}</span>{" "}
                {shown.deploys === 1 ? "deploy" : "deploys"}
              </p>
              <p className="tabular-nums">
                {shown.releaseDays} of {shown.days} days with a release
              </p>
            </>
          ) : (
            <p className="text-muted">No data</p>
          )}
        </Tooltip>
      )}
    </div>
  );
};

const LEAD = { top: 26, bottom: 116, labels: 134, bracket: 146, total: 162, height: 168 };
const WITHIN_A_WEEK = LEAD_TIME_BINS.findIndex((bin) => bin.below === 168) + 1;

const sharesOf = (stats: PeriodStats) =>
  stats.leadTimeBins.map((count) => (stats.commits > 0 ? count / stats.commits : 0));

const sumOf = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const LeadTimeChart = ({
  report,
  previousLabel,
}: {
  report: PeriodReport;
  previousLabel: string;
}) => {
  const [ref, width] = useMeasuredWidth();
  const [active, setActive] = useState<number | null>(null);
  const now = sharesOf(report.current);
  const before = report.before && report.before.commits > 0 ? sharesOf(report.before) : null;
  const band = width / LEAD_TIME_BINS.length;
  const bar = Math.max(4, Math.min(20, band * 0.28));
  const max = Math.max(0.1, ...now, ...(before ?? [])) * 1.18;
  const yOf = (share: number) => LEAD.bottom - (share / max) * (LEAD.bottom - LEAD.top);
  const roomForBoth = band >= 72;
  const withinAWeek = sumOf(now.slice(0, WITHIN_A_WEEK));
  const summary = LEAD_TIME_BINS.map(
    (bin, index) =>
      `${bin.label}: ${formatShare(now[index] ?? 0)}${
        before ? ` (${formatShare(before[index] ?? 0)} before)` : ""
      }`,
  ).join(", ");

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={LEAD.height}
        role="img"
        aria-label={`Share of changes by time to reach production. ${summary}`}
        className="block overflow-visible"
        onMouseMove={(event) => {
          const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
          setActive(x >= 0 && x < width ? Math.floor(x / band) : null);
        }}
        onMouseLeave={() => setActive(null)}
      >
        {active !== null && (
          <rect
            x={active * band}
            y={LEAD.top - 8}
            width={band}
            height={LEAD.bottom - LEAD.top + 8}
            rx="4"
            className="fill-highlight"
          />
        )}
        {LEAD_TIME_BINS.map((bin, index) => {
          const centre = (index + 0.5) * band;
          const share = now[index] ?? 0;
          const earlier = before?.[index];
          const x = earlier === undefined ? centre : centre + 1 + bar / 2;
          return (
            <g key={bin.label}>
              {earlier !== undefined && (
                <path
                  d={columnPath(centre - 1 - bar / 2, bar, yOf(earlier), LEAD.bottom)}
                  className="fill-previous"
                />
              )}
              {earlier !== undefined && roomForBoth && earlier > 0 && (
                <text
                  x={centre - 1 - bar / 2}
                  y={yOf(earlier) - 6}
                  textAnchor="middle"
                  className="fill-muted text-[11px] tabular-nums"
                >
                  {formatShare(earlier)}
                </text>
              )}
              <path d={columnPath(x, bar, yOf(share), LEAD.bottom)} className="fill-ink" />
              {share > 0 && (
                <text
                  x={x}
                  y={yOf(share) - 6}
                  textAnchor="middle"
                  className="fill-ink text-[11px] font-semibold tabular-nums"
                >
                  {formatShare(share)}
                </text>
              )}
              <text
                x={centre}
                y={LEAD.labels}
                textAnchor="middle"
                className="fill-muted text-[11px] tabular-nums"
              >
                {band < 64 ? bin.short : bin.label}
              </text>
            </g>
          );
        })}
        <line x1="0" x2={width} y1={LEAD.bottom} y2={LEAD.bottom} className="stroke-line-strong" />
        <path
          d={`M6 ${LEAD.bracket - 5}V${LEAD.bracket}H${WITHIN_A_WEEK * band - 6}V${LEAD.bracket - 5}`}
          fill="none"
          className="stroke-line-strong"
        />
        <text x="6" y={LEAD.total} className="text-[12px] tabular-nums">
          <tspan className="fill-ink font-semibold">
            Within a week: {formatShare(withinAWeek)}
          </tspan>
          {before && (
            <tspan className="fill-muted">
              {" "}
              · {formatShare(sumOf(before.slice(0, WITHIN_A_WEEK)))} before
            </tspan>
          )}
        </text>
      </svg>
      {active !== null && (
        <Tooltip x={(active + 0.5) * band} width={width}>
          <p className="font-semibold text-ink">{LEAD_TIME_BINS[active]?.label}</p>
          <p className="tabular-nums">
            <span className="font-semibold text-ink">{formatShare(now[active] ?? 0)}</span> of the
            changes ({report.current.leadTimeBins[active] ?? 0})
          </p>
          {before && (
            <p className="text-muted tabular-nums">
              {formatShare(before[active] ?? 0)} {previousLabel.toLowerCase()}
            </p>
          )}
        </Tooltip>
      )}
    </div>
  );
};

const STRIP = { top: 6, base: 34, labels: 52, height: 58 };
const DAY_MS = 86_400_000;
const SHOWN_FAILURES = 4;

const TICK_TONE: Record<Verdict["kind"], string> = {
  clean: "stroke-clean",
  failed: "stroke-failed",
  watching: "stroke-watch",
  deployed: "stroke-line-strong",
  "build-failed": "stroke-line-strong",
};

export const reasonOf = (deploy: HistoryDeploy, verdict: Verdict) => {
  if (verdict.kind !== "failed") {
    return "";
  }
  const since = (date: Date) => formatSpan(date.getTime() - deploy.finishedAt.getTime());
  return verdict.reason === "hotfix"
    ? `Hotfix after ${since(verdict.at)}`
    : `Rolled back after ${since(verdict.at)}`;
};

export const Outcomes = ({ report }: { report: PeriodReport }) => {
  const [ref, width] = useMeasuredWidth();
  const [expanded, setExpanded] = useState(false);
  const { start, end } = report.range;
  const span = Math.max(1, end.getTime() - start.getTime());
  const xOf = (date: Date) => ((date.getTime() - start.getTime()) / span) * width;
  let previousX = Number.NEGATIVE_INFINITY;
  const ticks = report.outcomes.map(({ deploy, verdict }) => {
    const x = Math.min(width - 1, Math.max(previousX + 3, xOf(deploy.finishedAt)));
    previousX = x;
    return { key: deploy.id, x, kind: verdict.kind };
  });
  const markUnit = span > 40 * DAY_MS ? "month" : "week";
  const failures = report.outcomes.filter((outcome) => outcome.verdict.kind === "failed").reverse();
  const listed = expanded ? failures : failures.slice(0, SHOWN_FAILURES);
  const { failure } = report.current;
  const legend = [
    { key: "clean", count: failure.clean, Icon: CheckCircle, tone: "text-clean", label: "clean" },
    {
      key: "failed",
      count: failure.failed,
      Icon: WarningCircle,
      tone: "text-failed",
      label: "failed",
    },
    { key: "watching", count: failure.watching, Icon: Eye, tone: "text-watch", label: "watching" },
  ].filter((entry) => entry.count > 0);

  return (
    <div>
      <div ref={ref}>
        <svg
          width={width}
          height={STRIP.height}
          role="img"
          aria-label={`Every deploy, ${formatRange(report.range)}: ${legend
            .map((entry) => `${entry.count} ${entry.label}`)
            .join(", ")}`}
          className="block overflow-visible"
        >
          <line
            x1="0"
            x2={width}
            y1={STRIP.base + 0.5}
            y2={STRIP.base + 0.5}
            className="stroke-line-strong"
          />
          {ticks.map((tick) => (
            <line
              key={tick.key}
              x1={tick.x}
              x2={tick.x}
              y1={tick.kind === "failed" ? STRIP.top : STRIP.base - 14}
              y2={STRIP.base - 1}
              strokeWidth="2"
              strokeLinecap="round"
              className={TICK_TONE[tick.kind]}
            />
          ))}
          {bucketRanges(report.range, markUnit).map((mark, index) => (
            <text
              key={mark.start.getTime()}
              x={Math.max(0, xOf(mark.start))}
              y={STRIP.labels}
              className="fill-muted text-[11px] tabular-nums"
            >
              {bucketLabel(mark, markUnit, index)}
            </text>
          ))}
        </svg>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold tabular-nums">
        {legend.map(({ key, count, Icon, tone, label }) => (
          <span key={key} className={`inline-flex items-center gap-1.5 ${tone}`}>
            <Icon size={16} weight="bold" aria-hidden />
            {count} {label}
          </span>
        ))}
      </p>
      {failures.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {listed.map(({ deploy, verdict }) => (
            <li
              key={deploy.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-[13px]"
            >
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-ink">{deploy.service}</span>
                <span className="font-medium text-body">{deploy.version}</span>
                <span className="text-body">{reasonOf(deploy, verdict)}</span>
              </span>
              <time dateTime={deploy.finishedAt.toISOString()} className="text-muted">
                {dayMonth.format(deploy.finishedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
      {failures.length > SHOWN_FAILURES && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 rounded-inset text-[13px] font-semibold text-ink underline decoration-line-strong transition-[text-decoration-color] duration-150 ease-out hover:decoration-ink"
        >
          {expanded ? "Show fewer" : `Show all ${failures.length} failed deploys`}
        </button>
      )}
    </div>
  );
};

const Bar = ({
  value,
  max,
  previous = false,
}: {
  value: number;
  max: number;
  previous?: boolean;
}) => (
  <div className="flex items-center gap-2">
    <div
      className={`h-2.5 rounded-r-inset ${previous ? "bg-previous" : "bg-ink"}`}
      style={{ width: `${(value / max) * 85}%` }}
    />
    <span
      className={`text-[12px] tabular-nums ${previous ? "text-muted" : "font-semibold text-ink"}`}
    >
      {value}
    </span>
  </div>
);

export const ShippedBars = ({ report }: { report: PeriodReport }) => {
  const rows = [
    { label: "Features", now: report.current.features, before: report.before?.features },
    { label: "Fixes", now: report.current.fixes, before: report.before?.fixes },
  ];
  const max = Math.max(1, ...rows.flatMap((row) => [row.now, row.before ?? 0]));
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
      {rows.map((row) => (
        <Fragment key={row.label}>
          <span className="text-[13px] text-body">{row.label}</span>
          <div className="space-y-1">
            <Bar value={row.now} max={max} />
            {row.before !== undefined && <Bar value={row.before} max={max} previous />}
          </div>
        </Fragment>
      ))}
    </div>
  );
};
