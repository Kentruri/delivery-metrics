import type { Conflict, ConflictKind } from "@cloudnonic/delivery-contracts";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { listJoin } from "./format";
import { GITHUB_OWNER, pullUrl, releaseUrl } from "./fromApi";

const KIND_LABEL: Record<ConflictKind, string> = {
  no_host_record: "Merged, never deployed",
  no_github_record: "Deployed, never merged",
  tag_without_deploy: "Tagged, never deployed",
};

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const refUrl = (conflict: Conflict) => {
  if (conflict.ref.startsWith("#")) {
    return pullUrl(conflict.repo, Number(conflict.ref.slice(1)));
  }
  if (conflict.kind === "tag_without_deploy") {
    return releaseUrl(conflict.repo, conflict.ref);
  }
  return `https://github.com/${GITHUB_OWNER}/${conflict.repo}/commit/${conflict.ref}`;
};

const introFor = ({ conflicts, environment, hosts, disconnected }: ConflictsSectionProps) => {
  const connected = hosts.filter((host) => !disconnected.includes(host));
  if (connected.length === 0) {
    return `Conflicts are checked once ${listJoin(hosts)} ${hosts.length === 1 ? "is" : "are"} connected; until then every deploy comes from a GitHub merge.`;
  }
  const unchecked =
    disconnected.length === 0
      ? ""
      : ` ${listJoin(disconnected)} ${disconnected.length === 1 ? "is not connected yet, so its deploys are" : "are not connected yet, so their deploys are"} not checked.`;
  const count = conflicts.length;
  if (count === 0) {
    return `${listJoin(["GitHub", ...connected])} agree on every ${environment} deploy.${unchecked}`;
  }
  return `${count} ${environment} ${count === 1 ? "record where" : "records where"} GitHub and the host tell different stories. They stay on the board and in the CSV; none is resolved silently.${unchecked}`;
};

interface ConflictsSectionProps {
  conflicts: Conflict[];
  environment: string;
  // Every host on the board, and the ones without a token.
  hosts: string[];
  disconnected: string[];
}

export const ConflictsSection = (props: ConflictsSectionProps) => (
  <section aria-labelledby="conflicts-heading" className="mt-12">
    <h2 id="conflicts-heading" className="text-[15px] font-semibold text-ink">
      Where the sources disagree
    </h2>
    <p className="mt-1 mb-3 text-[14px] text-body">{introFor(props)}</p>
    {props.conflicts.length > 0 && (
      <ol className="divide-y divide-line border-y border-line">
        {props.conflicts.map((conflict) => (
          <li
            key={conflict.id}
            className="grid gap-x-6 gap-y-1 px-3 py-3 text-[13px] sm:grid-cols-[7rem_12rem_minmax(0,1fr)]"
          >
            <time dateTime={conflict.at} className="text-muted tabular-nums">
              {day.format(new Date(conflict.at))}
            </time>
            <span>
              <span className="block font-semibold text-ink">{KIND_LABEL[conflict.kind]}</span>
              <span className="block text-muted">{conflict.repo}</span>
            </span>
            <span className="text-body">
              {conflict.detail}{" "}
              <a
                href={refUrl(conflict)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-inset font-semibold text-ink underline decoration-line-strong transition-[text-decoration-color] duration-150 ease-out hover:decoration-ink"
              >
                {conflict.ref}
                <ArrowSquareOut size={12} weight="bold" aria-hidden />
                <span className="sr-only">(opens GitHub)</span>
              </a>
            </span>
          </li>
        ))}
      </ol>
    )}
  </section>
);
