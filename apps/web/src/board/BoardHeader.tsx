import type { Environment } from "@cloudnonic/delivery-contracts";
import { ArrowsClockwise, SignOut } from "@phosphor-icons/react";
import { CloudnonicMark } from "../brand/CloudnonicMark";
import { SelectField } from "./controls";
import { formatAgo } from "./format";
import { ALL_REPOS } from "./model";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface BoardHeaderProps {
  environments: Environment[];
  environment: Environment;
  onEnvironmentChange: (environment: Environment) => void;
  repos: string[];
  repo: string;
  onRepoChange: (repo: string) => void;
  syncedAt: Date | null;
  now: Date;
  onSignOut: () => void;
}

export const BoardHeader = ({
  environments,
  environment,
  onEnvironmentChange,
  repos,
  repo,
  onRepoChange,
  syncedAt,
  now,
  onSignOut,
}: BoardHeaderProps) => (
  <header className="border-b border-line bg-panel">
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
      <p className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2.5 rounded-inset text-ink">
          <CloudnonicMark className="h-[18px] w-auto" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Delivery Metrics</span>
        </a>
        <span aria-hidden className="h-4 w-px bg-line-strong" />
        <span className="text-[13px] font-semibold text-body">Tensorparc</span>
      </p>

      <SelectField
        label="Environment"
        options={environments.map((name) => ({ value: name, label: capitalize(name) }))}
        value={environment}
        onChange={onEnvironmentChange}
      />

      <SelectField
        label="Repo"
        options={[
          { value: ALL_REPOS, label: "All repos" },
          ...repos.map((name) => ({ value: name, label: name })),
        ]}
        value={repo}
        onChange={onRepoChange}
      />

      <div className="flex items-center gap-5 sm:ml-auto">
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <ArrowsClockwise size={16} weight="bold" aria-hidden />
          {syncedAt ? `Synced ${formatAgo(syncedAt, now)}` : "Not synced yet"}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-1.5 rounded-inset text-[13px] font-semibold text-body transition-colors duration-150 ease-out hover:text-ink"
        >
          <SignOut size={16} weight="bold" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  </header>
);
