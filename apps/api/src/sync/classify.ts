import type { Change, DeployKind } from "@cloudnonic/delivery-contracts";
import type { Merge } from "./types.js";

const PROMOTION_BRANCHES = new Set(["develop", "staging", "main"]);
const CONVENTIONAL = /^(\w+)(\([^)]*\))?!?:\s*/;
const GITMOJI = /^(?::[a-z0-9_+-]+:\s*)+/i;
const EMOJI = /^(?:\p{Extended_Pictographic}️?\s*)+/u;
const BRANCH_TITLE = /^[\w.-]+\/(?:ten|cnc)[ -]\d+\s+/i;
const RELEASE_TITLE = /^chore(\([^)]*\))?: release\b/i;
const FIX_TYPES = new Set(["fix", "hotfix", "bugfix"]);
const INTERNAL_TYPES = new Set([
  "refactor",
  "perf",
  "chore",
  "ci",
  "build",
  "test",
  "tests",
  "docs",
  "style",
  "revert",
]);

const firstLine = (text: string) => text.split("\n", 1)[0] ?? "";

export const isReleaseBump = (headRef: string, title: string) =>
  headRef.startsWith("release-please--") || RELEASE_TITLE.test(title);

export const isReleaseCommit = (message: string) => RELEASE_TITLE.test(firstLine(message));

// Production takes promotions from staging; anything else merged straight into main is a hotfix.
export const kindOfMerge = (merge: Merge): DeployKind => {
  if (isReleaseBump(merge.headRef, merge.title)) {
    return "release";
  }
  if (merge.headRef.startsWith("dependabot/")) {
    return "dependency";
  }
  if (/^revert\b/i.test(merge.title) || merge.headRef.startsWith("revert-")) {
    return "rollback";
  }
  if (merge.environment === "production" && !PROMOTION_BRANCHES.has(merge.headRef)) {
    return "hotfix";
  }
  return "change";
};

export const isPromotion = (headRef: string) => PROMOTION_BRANCHES.has(headRef);

export const ticketOf = (headRef: string): string | null => {
  const match = /\b(ten|cnc)-(\d+)\b/i.exec(headRef);
  return match?.[1] && match[2] ? `${match[1].toUpperCase()}-${match[2]}` : null;
};

export const cleanTitle = (title: string) => {
  const text = title
    .replace(CONVENTIONAL, "")
    .replace(GITMOJI, "")
    .replace(EMOJI, "")
    .replace(BRANCH_TITLE, "")
    .trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : title;
};

// A hotfix branch repeats the fix for main ("...-main"); its title drops that suffix.
export const changeOf = (
  pull: Pick<Merge, "number" | "title" | "headRef">,
  fallback: Change["kind"] = "feature",
): Change | "internal" => {
  const type = CONVENTIONAL.exec(pull.title)?.[1]?.toLowerCase();
  if (type && INTERNAL_TYPES.has(type)) {
    return "internal";
  }
  const branch = pull.headRef.replace(/^[\w.-]+\//, "");
  const isFix = type
    ? FIX_TYPES.has(type)
    : fallback === "fix" || /(?:^|[/-])(?:fix|hotfix|bug)/i.test(branch);
  const title = cleanTitle(pull.title);
  return {
    kind: isFix ? "fix" : "feature",
    title: branch.endsWith("-main") ? title.replace(/\s+main$/i, "") : title,
    ticket: ticketOf(pull.headRef),
    pullNumber: pull.number,
  };
};

export const pullNumberOf = (message: string): number | null => {
  const line = firstLine(message);
  const match = /^Merge pull request #(\d+)/.exec(line) ?? /\(#(\d+)\)\s*$/.exec(line);
  return match?.[1] ? Number(match[1]) : null;
};

export const shortSha = (sha: string | null) => (sha ? sha.slice(0, 7) : "unknown");

export const summaryLine = firstLine;
