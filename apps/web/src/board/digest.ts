import { formatAgo, formatSpan } from "./format";
import type { DeployView, Verdict } from "./model";
import { verdictOf } from "./verdict";

export interface DigestClaim {
  deployId: string;
  subject: string;
  text: string;
  tone: Verdict["kind"];
}

export interface Digest {
  headline: string;
  claims: DigestClaim[];
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six"];
const countWord = (count: number) => NUMBER_WORDS[count] ?? String(count);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (count: number, one: string, many = `${one}s`) =>
  `${countWord(count)} ${count === 1 ? one : many}`;

const sameService = (a: DeployView, b: DeployView) => a.service === b.service && a !== b;

const fixedBy = (deploy: DeployView, rows: DeployView[]) => {
  const at = deploy.hotfixAt ?? deploy.rollbackAt;
  return rows.find(
    (other) => sameService(other, deploy) && other.finishedAt.getTime() === at?.getTime(),
  );
};

const fixes = (deploy: DeployView, rows: DeployView[]) =>
  deploy.kind === "hotfix" || deploy.kind === "rollback"
    ? rows.find(
        (other) =>
          sameService(other, deploy) &&
          (other.hotfixAt ?? other.rollbackAt)?.getTime() === deploy.finishedAt.getTime(),
      )
    : undefined;

const shippedText = (deploy: DeployView) => {
  const features = deploy.changes.items.filter((item) => item.kind === "feature").length;
  const fixed = deploy.changes.items.length - features;
  const parts = [
    features > 0 ? plural(features, "feature") : "",
    fixed > 0 ? plural(fixed, "fix", "fixes") : "",
  ].filter(Boolean);
  return parts.length > 0 ? ` It shipped ${parts.join(" and ")}.` : "";
};

const productionClaim = (deploy: DeployView, rows: DeployView[], now: Date): DigestClaim => {
  const verdict = verdictOf(deploy, now);
  const ago = formatAgo(deploy.finishedAt, now);
  const after = (date: Date) => formatSpan(date.getTime() - deploy.finishedAt.getTime());
  const fixing = fixes(deploy, rows);
  const fixKind = deploy.kind === "rollback" ? "rollback" : "hotfix";
  let opening = "";
  if (fixing) {
    opening = `is the ${fixKind} for ${fixing.version}; it `;
  } else if (deploy.kind === "hotfix" || deploy.kind === "rollback") {
    opening = `is a ${fixKind}; it `;
  }
  const base = { deployId: deploy.id, subject: `${deploy.service} ${deploy.version}` };

  if (verdict.kind === "watching") {
    return {
      ...base,
      tone: "watching",
      text: `${opening}reached production ${ago}. Nothing has needed a hotfix or a rollback so far, with ${formatSpan(verdict.msLeft)} of its watch left.`,
    };
  }
  if (verdict.kind === "failed") {
    const fix = fixedBy(deploy, rows);
    const what = verdict.reason === "hotfix" ? "needed a hotfix" : "was rolled back";
    return {
      ...base,
      tone: "failed",
      text: `shipped ${ago} and ${what} ${after(verdict.at)} later${fix ? ` (${fix.version})` : ""}, so it counts as failed.`,
    };
  }
  return {
    ...base,
    tone: "clean",
    text: `${opening}shipped ${ago} and needed no hotfix or rollback in its 72-hour watch.`,
  };
};

const earlierFailure = (deploy: DeployView, now: Date) => {
  const verdict = verdictOf(deploy, now);
  return verdict.kind === "failed" && verdict.reason === "rollback"
    ? `an earlier ${deploy.service} deploy was rolled back`
    : `an earlier ${deploy.service} deploy needed a hotfix`;
};

const productionHeadline = (latest: DigestClaim[], earlierFailures: DeployView[], now: Date) => {
  const count = (tone: DigestClaim["tone"]) => latest.filter((claim) => claim.tone === tone).length;
  const failed = count("failed");
  const watching = count("watching");

  if (failed > 0) {
    return failed === 1
      ? "One of the latest production deploys needs attention."
      : `${capitalize(countWord(failed))} of the latest production deploys need attention.`;
  }
  const fine = watching > 0 ? "Production looks fine so far" : "Production is fine now";
  const [onlyFailure] = earlierFailures;
  if (onlyFailure && earlierFailures.length === 1) {
    return `${fine}; ${earlierFailure(onlyFailure, now)}.`;
  }
  if (earlierFailures.length > 1) {
    return `${fine}; ${countWord(earlierFailures.length)} earlier deploys failed.`;
  }
  if (watching > 0) {
    return watching === 1
      ? `${fine}. One deploy is still in its watch window.`
      : `${fine}. ${capitalize(countWord(watching))} deploys are still in their watch windows.`;
  }
  return "Production is clean: every latest deploy passed its 72-hour watch.";
};

const latestPerService = (rows: DeployView[]) => {
  const seen = new Set<string>();
  return rows.filter((deploy) => {
    if (seen.has(deploy.service)) {
      return false;
    }
    seen.add(deploy.service);
    return true;
  });
};

// Counted deploys only: release bumps, redeploys and failed builds tell nothing about production.
export const buildDigest = (deploys: DeployView[], environment: string, now: Date): Digest => {
  const rows = deploys
    .filter((deploy) => deploy.counted)
    .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
  const latest = latestPerService(rows);
  const [newest] = latest;
  if (!newest) {
    return { headline: `Nothing has shipped to ${environment} yet.`, claims: [] };
  }

  if (environment !== "production") {
    return {
      headline: `The latest ${environment} deploy went out ${formatAgo(newest.finishedAt, now)}.`,
      claims: latest.map((deploy) => ({
        deployId: deploy.id,
        subject: `${deploy.service} ${deploy.version}`,
        tone: "deployed",
        text: `reached ${environment} ${formatAgo(deploy.finishedAt, now)}${deploy.shippedBy ? `, merged by ${deploy.shippedBy}` : ""}.`,
      })),
    };
  }

  const earlierFailures = rows.filter(
    (deploy) => !latest.includes(deploy) && verdictOf(deploy, now).kind === "failed",
  );
  const latestClaims = latest.map((deploy) => {
    const claim = productionClaim(deploy, rows, now);
    return { ...claim, text: `${claim.text}${shippedText(deploy)}` };
  });
  return {
    headline: productionHeadline(latestClaims, earlierFailures, now),
    claims: [
      ...latestClaims,
      ...earlierFailures.map((deploy) => productionClaim(deploy, rows, now)),
    ],
  };
};
