import { outcomeAt, WINDOW_HOURS } from "@cloudnonic/delivery-contracts";
import type { DeployView, Verdict } from "./model";

export { WINDOW_HOURS };
export const WATCH_MS = WINDOW_HOURS * 3_600_000;

type Watched = Pick<
  DeployView,
  "status" | "environment" | "finishedAt" | "hotfixAt" | "rollbackAt"
>;

export const verdictOf = (deploy: Watched, now: Date): Verdict => {
  if (deploy.status === "failed") {
    return { kind: "build-failed" };
  }
  if (deploy.environment !== "production") {
    return { kind: "deployed" };
  }
  const outcome = outcomeAt(
    {
      finishedAt: deploy.finishedAt.getTime(),
      hotfixAt: deploy.hotfixAt?.getTime() ?? null,
      rollbackAt: deploy.rollbackAt?.getTime() ?? null,
    },
    now.getTime(),
  );
  return outcome.kind === "failed"
    ? { kind: "failed", reason: outcome.reason, at: new Date(outcome.at) }
    : outcome;
};
