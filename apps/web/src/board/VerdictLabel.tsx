import { CheckCircle, CloudArrowUp, Eye, Prohibit, WarningCircle } from "@phosphor-icons/react";
import { formatShortSpan } from "./format";
import type { Verdict } from "./model";

const TONE = {
  watching: "text-watch",
  clean: "text-clean",
  failed: "text-failed",
  deployed: "text-muted",
  "build-failed": "text-muted",
} as const;

const ICON = {
  watching: Eye,
  clean: CheckCircle,
  failed: WarningCircle,
  deployed: CloudArrowUp,
  "build-failed": Prohibit,
} as const;

export const verdictText = (verdict: Verdict): string => {
  switch (verdict.kind) {
    case "watching":
      return `Watching, ${formatShortSpan(verdict.msLeft)} left`;
    case "clean":
      return "Clean";
    case "deployed":
      return "Deployed";
    case "build-failed":
      return "Did not deploy";
    case "failed":
      return verdict.reason === "hotfix" ? "Failed: hotfix" : "Failed: rollback";
  }
};

export const VerdictLabel = ({ verdict }: { verdict: Verdict }) => {
  const Icon = ICON[verdict.kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums ${TONE[verdict.kind]}`}
    >
      <Icon size={16} weight="bold" aria-hidden />
      {verdictText(verdict)}
    </span>
  );
};
