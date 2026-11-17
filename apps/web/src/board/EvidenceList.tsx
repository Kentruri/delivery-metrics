import { formatAgo } from "./format";
import { pullUrl } from "./fromApi";
import type { DeployView } from "./model";
import { ShippedChanges } from "./ShippedChanges";
import { VerdictLabel } from "./VerdictLabel";
import { verdictOf } from "./verdict";
import { WatchScale, WatchWindow } from "./WatchWindow";

const WATCHED_COLUMNS = "sm:grid-cols-[minmax(0,2fr)_10.5rem_minmax(0,1.6fr)] sm:gap-6";
const PLAIN_COLUMNS = "sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6";

const KIND_TAG: Partial<Record<DeployView["kind"], string>> = {
  hotfix: "Hotfix",
  rollback: "Rollback",
  dependency: "Dependency update",
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface EvidenceListProps {
  deploys: DeployView[];
  now: Date;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

export const EvidenceList = ({ deploys, now, activeId, onActivate }: EvidenceListProps) => {
  const watched = deploys.some((deploy) => deploy.environment === "production");
  const columns = watched ? WATCHED_COLUMNS : PLAIN_COLUMNS;
  return (
    <div>
      <div
        className={`grid items-end gap-3 px-3 pb-2 text-[12px] text-muted ${columns}`}
        aria-hidden
      >
        <span className="hidden sm:block">Deploy</span>
        <span className="hidden sm:block">{watched ? "Verdict" : "State"}</span>
        {watched && <WatchScale />}
      </div>
      <ol className="divide-y divide-line border-y border-line">
        {deploys.map((deploy) => {
          const verdict = verdictOf(deploy, now);
          const tag = KIND_TAG[deploy.kind];
          return (
            <li
              key={deploy.id}
              id={`deploy-${deploy.id}`}
              data-deploy-row
              tabIndex={-1}
              onMouseEnter={() => onActivate(deploy.id)}
              onMouseLeave={() => onActivate(null)}
              className={`grid scroll-mt-6 gap-3 px-3 py-4 transition-colors duration-150 ease-out sm:items-center ${columns} ${
                deploy.id === activeId ? "bg-highlight" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">{deploy.service}</span>
                  <span className="text-[13px] font-medium text-body">{deploy.version}</span>
                  {tag && <span className="text-[12px] font-semibold text-muted">{tag}</span>}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  <time dateTime={deploy.finishedAt.toISOString()}>
                    {capitalize(formatAgo(deploy.finishedAt, now))}
                  </time>
                  {deploy.shippedBy ? `, by ${deploy.shippedBy}` : ""} via {deploy.source}
                  {deploy.pullNumber !== null && (
                    <>
                      {" · "}
                      <a
                        href={pullUrl(deploy.service, deploy.pullNumber)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`#${deploy.pullNumber} (opens GitHub)`}
                        className="rounded-inset text-body underline decoration-line-strong transition-[text-decoration-color] duration-150 ease-out hover:decoration-ink"
                      >
                        #{deploy.pullNumber}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <VerdictLabel verdict={verdict} />
              {watched && <WatchWindow deploy={deploy} verdict={verdict} now={now} />}
              <ShippedChanges changes={deploy.changes} repo={deploy.service} />
            </li>
          );
        })}
      </ol>
    </div>
  );
};
