import { formatShortSpan } from "./format";
import type { DeployView, Verdict } from "./model";
import { WATCH_MS } from "./verdict";

const ELAPSED = {
  watching: "h-[3px] bg-watch",
  clean: "h-0.5 bg-clean",
  failed: "h-0.5 bg-muted",
} as const;

const DAY_MARK = `${(24 / 72) * 100}%`;

const share = (deploy: DeployView, date: Date) =>
  Math.min(1, Math.max(0, (date.getTime() - deploy.finishedAt.getTime()) / WATCH_MS));

const describe = (deploy: DeployView, verdict: Verdict, now: Date) => {
  if (verdict.kind === "failed") {
    const after = formatShortSpan(verdict.at.getTime() - deploy.finishedAt.getTime());
    return `Watch window: ${verdict.reason} ${after} after the deploy`;
  }
  const elapsed = formatShortSpan(Math.min(WATCH_MS, now.getTime() - deploy.finishedAt.getTime()));
  return `Watch window: ${elapsed} of 72 h elapsed, no hotfix or rollback`;
};

export const WatchScale = () => (
  <div className="relative h-3.5 text-[11px] leading-none text-muted tabular-nums" aria-hidden>
    <span className="absolute left-0">0 h</span>
    <span className="absolute -translate-x-1/2" style={{ left: DAY_MARK }}>
      24 h
    </span>
    <span className="absolute right-0">72 h</span>
  </div>
);

export const WatchWindow = ({
  deploy,
  verdict,
  now,
}: {
  deploy: DeployView;
  verdict: Verdict;
  now: Date;
}) => {
  if (verdict.kind !== "watching" && verdict.kind !== "clean" && verdict.kind !== "failed") {
    return null;
  }
  return (
    <div className="relative h-3 w-full" role="img" aria-label={describe(deploy, verdict, now)}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
      <div
        className={`absolute top-1/2 left-0 -translate-y-1/2 rounded-full ${ELAPSED[verdict.kind]}`}
        style={{ width: `${share(deploy, now) * 100}%` }}
      />
      <div className="absolute top-0.5 h-2 w-px bg-line-strong" style={{ left: DAY_MARK }} />
      {verdict.kind === "failed" && (
        <div
          className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded-full bg-failed"
          style={{ left: `${share(deploy, verdict.at) * 100}%` }}
        />
      )}
    </div>
  );
};
