import { deploysCsvPath, type Environment, summaryCsvPath } from "@cloudnonic/delivery-contracts";
import { DownloadSimple } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { exportUrl } from "../api";
import { ConflictsSection } from "./ConflictsSection";
import { DeployDigest } from "./DeployDigest";
import { buildDigest } from "./digest";
import { EvidenceList } from "./EvidenceList";
import { type BoardData, disconnectedHosts } from "./fromApi";
import { ALL_REPOS } from "./model";
import { PeriodSection } from "./period/PeriodSection";

const LATEST_ROWS = 8;

const DOWNLOADS = [
  { label: "Every deploy", path: deploysCsvPath },
  { label: "By month", path: summaryCsvPath },
];

const Downloads = () => (
  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
    <span className="text-muted">CSV, all environments:</span>
    {DOWNLOADS.map(({ label, path }) => (
      <a
        key={path}
        href={exportUrl(path, "all")}
        download
        className="inline-flex items-center gap-1 rounded-inset font-semibold text-ink underline decoration-line-strong transition-[text-decoration-color] duration-150 ease-out hover:decoration-ink"
      >
        <DownloadSimple size={14} weight="bold" aria-hidden />
        {label}
      </a>
    ))}
  </p>
);

interface BoardBodyProps {
  data: BoardData;
  environment: Environment;
  repo: string;
  now: Date;
}

export const BoardBody = ({ data, environment, repo, now }: BoardBodyProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scoped = useMemo(() => {
    const inScope = (name: string) => repo === ALL_REPOS || name === repo;
    return {
      repos: data.repos.filter((entry) => inScope(entry.name)),
      deploys: data.deploys.filter((deploy) => inScope(deploy.service)),
      conflicts: data.conflicts.filter((conflict) => inScope(conflict.repo)),
    };
  }, [data, repo]);
  const latest = useMemo(
    () =>
      scoped.deploys
        .filter((deploy) => deploy.counted || deploy.status === "failed")
        .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())
        .slice(0, LATEST_ROWS),
    [scoped],
  );
  const history = useMemo(
    () => ({ since: data.since, deploys: scoped.deploys.filter((deploy) => deploy.counted) }),
    [data.since, scoped],
  );
  // The summary speaks only of the rows below, so every claim can link to its row.
  const digest = buildDigest(latest, environment, now);

  return (
    <>
      <DeployDigest digest={digest} activeId={activeId} onActivate={setActiveId} />

      <section aria-labelledby="deploys-heading" className="mt-12">
        <h2 id="deploys-heading" className="mb-3 text-[15px] font-semibold text-ink">
          Latest deploys to {environment}
        </h2>
        {latest.length > 0 ? (
          <EvidenceList deploys={latest} now={now} activeId={activeId} onActivate={setActiveId} />
        ) : (
          <div className="rounded-panel border border-dashed border-line-strong px-5 py-8">
            <p className="font-semibold text-ink">No deploys to {environment} yet.</p>
            <p className="mt-1 text-[14px] text-body">
              They appear after the daily sync at 05:00 UTC, each with its 72-hour watch window, and
              the summary above says whether it hurt production.
            </p>
          </div>
        )}
      </section>

      <PeriodSection
        history={history}
        environment={environment}
        now={now}
        actions={<Downloads />}
      />

      <ConflictsSection
        conflicts={scoped.conflicts}
        environment={environment}
        hosts={[...new Set(scoped.repos.map((entry) => entry.host))]}
        disconnected={[
          ...new Set(disconnectedHosts({ repos: scoped.repos, sources: data.sources })),
        ]}
      />
    </>
  );
};
