import { describe, expect, it } from "vitest";
import {
  changeOf,
  cleanTitle,
  isReleaseCommit,
  kindOfMerge,
  pullNumberOf,
  shortSha,
  ticketOf,
} from "./classify.js";
import type { Merge } from "./types.js";

const merge = (fields: Partial<Merge>): Merge => ({
  number: 1,
  title: "Staging",
  headRef: "staging",
  environment: "production",
  sha: "abc",
  mergedAt: 0,
  mergedBy: "kevin",
  ...fields,
});

describe("kindOfMerge", () => {
  it("tells promotions, release bumps, dependencies, reverts and hotfixes apart", () => {
    expect(kindOfMerge(merge({}))).toBe("change");
    expect(kindOfMerge(merge({ headRef: "release-please--branches--main" }))).toBe("release");
    expect(kindOfMerge(merge({ headRef: "x", title: "chore(main): release 3.112.0" }))).toBe(
      "release",
    );
    expect(kindOfMerge(merge({ headRef: "dependabot/npm_and_yarn/vite-6" }))).toBe("dependency");
    expect(kindOfMerge(merge({ title: 'Revert "feat: x"', headRef: "revert-3301-x" }))).toBe(
      "rollback",
    );
    expect(kindOfMerge(merge({ headRef: "kevintrujillo/ten-4208-dates-main" }))).toBe("hotfix");
    expect(
      kindOfMerge(merge({ environment: "develop", headRef: "kevintrujillo/ten-4208-dates" })),
    ).toBe("change");
  });
});

describe("changeOf", () => {
  it("reads features, fixes and internal work from the pull request title", () => {
    expect(
      changeOf({
        number: 3270,
        title: "feat: :art: feedback events",
        headRef: "kevintrujillo/ten-4199-fix-event-editor",
      }),
    ).toEqual({ kind: "feature", title: "Feedback events", ticket: "TEN-4199", pullNumber: 3270 });
    expect(
      changeOf({ number: 3280, title: "fix: :bug: wiki link color", headRef: "leon/cnc-7311-x" }),
    ).toEqual({ kind: "fix", title: "Wiki link color", ticket: "CNC-7311", pullNumber: 3280 });
    expect(changeOf({ number: 1, title: "refactor: :recycle: login", headRef: "x" })).toBe(
      "internal",
    );
  });

  it("falls back to the branch name when the title has no type", () => {
    expect(
      changeOf({
        number: 2,
        title: "Kevintrujillo/ten 4137 remove pusher app secret",
        headRef: "kevintrujillo/ten-4137-remove-pusher",
      }),
    ).toEqual({
      kind: "feature",
      title: "Remove pusher app secret",
      ticket: "TEN-4137",
      pullNumber: 2,
    });
    expect(
      changeOf({ number: 3, title: "Coverage", headRef: "leon/bugfix-coverage" }),
    ).toMatchObject({ kind: "fix", ticket: null });
    expect(
      changeOf(
        {
          number: 3301,
          title: "Kevintrujillo/ten 4208 transactions display date main",
          headRef: "kevintrujillo/ten-4208-transactions-display-date-main",
        },
        "fix",
      ),
    ).toEqual({
      kind: "fix",
      title: "Transactions display date",
      ticket: "TEN-4208",
      pullNumber: 3301,
    });
  });
});

describe("helpers", () => {
  it("cleans titles, finds tickets and pull request numbers", () => {
    expect(cleanTitle("✨ new filters")).toBe("New filters");
    expect(cleanTitle("feat:")).toBe("feat:");
    expect(ticketOf("main")).toBeNull();
    expect(pullNumberOf("Merge pull request #3301 from TensorParc-Inc/x\n\nbody")).toBe(3301);
    expect(pullNumberOf("feat: squash merged (#88)")).toBe(88);
    expect(pullNumberOf("plain commit")).toBeNull();
    expect(isReleaseCommit("chore(main): release 3.99.0\n\nnotes")).toBe(true);
    expect(isReleaseCommit("feat: release notes page")).toBe(false);
    expect(shortSha("0123456789")).toBe("0123456");
    expect(shortSha(null)).toBe("unknown");
  });
});
