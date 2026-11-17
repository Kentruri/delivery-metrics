import { describe, expect, it } from "vitest";
import { buildDigest } from "./digest";
import type { DeployView } from "./model";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = new Date(2026, 9, 29, 15, 0);
const ago = (ms: number) => new Date(now.getTime() - ms);

const deploy = (
  fields: Partial<DeployView> & Pick<DeployView, "id" | "service" | "finishedAt">,
): DeployView => ({
  environment: "production",
  source: "Forge",
  status: "succeeded",
  kind: "change",
  counted: true,
  version: "1.0.0",
  sha: "abc",
  shippedBy: "aleja-mora",
  title: "Staging",
  pullNumber: null,
  leadTimesHours: [],
  changes: { items: [], internalCount: 0 },
  conflict: null,
  ...fields,
});

describe("buildDigest", () => {
  it("says when nothing has shipped", () => {
    expect(buildDigest([], "staging", now)).toEqual({
      headline: "Nothing has shipped to staging yet.",
      claims: [],
    });
  });

  it("keeps the latest counted deploy per service, newest first, with what it shipped", () => {
    const digest = buildDigest(
      [
        deploy({ id: "old-api", service: "belture-api", finishedAt: ago(6 * DAY) }),
        deploy({ id: "web", service: "belture-frontend", finishedAt: ago(26 * HOUR) }),
        deploy({
          id: "new-api",
          service: "belture-api",
          finishedAt: ago(3 * HOUR),
          changes: {
            items: [
              { kind: "feature", title: "Penalty carry-over", ticket: "TEN-4208", pullNumber: 1 },
              { kind: "feature", title: "Partner API", ticket: null, pullNumber: 2 },
              { kind: "fix", title: "Dates", ticket: null, pullNumber: 3 },
            ],
            internalCount: 1,
          },
        }),
        deploy({
          id: "bump",
          service: "belture-api",
          finishedAt: ago(HOUR),
          kind: "release",
          counted: false,
        }),
      ],
      "production",
      now,
    );
    expect(digest.claims.map((claim) => claim.deployId)).toEqual(["new-api", "web"]);
    expect(digest.headline).toBe(
      "Production looks fine so far. Two deploys are still in their watch windows.",
    );
    expect(digest.claims[0]?.text).toBe(
      "reached production 3 hours ago. Nothing has needed a hotfix or a rollback so far, with 69 hours of its watch left. It shipped two features and one fix.",
    );
  });

  it("names a hotfix from both sides and explains the earlier failure", () => {
    const hotfixShipped = ago(26 * HOUR);
    const digest = buildDigest(
      [
        deploy({ id: "api", service: "belture-api", version: "3.99.0", finishedAt: ago(3 * HOUR) }),
        deploy({
          id: "fix",
          service: "belture-frontend",
          version: "3.112.1",
          kind: "hotfix",
          finishedAt: hotfixShipped,
        }),
        deploy({
          id: "broken",
          service: "belture-frontend",
          version: "3.112.0",
          finishedAt: ago(3 * DAY + 2 * HOUR),
          hotfixAt: hotfixShipped,
        }),
      ],
      "production",
      now,
    );
    expect(digest.headline).toBe(
      "Production looks fine so far; an earlier belture-frontend deploy needed a hotfix.",
    );
    expect(digest.claims.map((claim) => [claim.deployId, claim.tone, claim.text])).toEqual([
      [
        "api",
        "watching",
        "reached production 3 hours ago. Nothing has needed a hotfix or a rollback so far, with 69 hours of its watch left.",
      ],
      [
        "fix",
        "watching",
        "is the hotfix for 3.112.0; it reached production yesterday at 13:00. Nothing has needed a hotfix or a rollback so far, with 46 hours of its watch left.",
      ],
      [
        "broken",
        "failed",
        "shipped Monday at 13:00 and needed a hotfix 48 hours later (3.112.1), so it counts as failed.",
      ],
    ]);
  });

  it("leads with a latest deploy that failed, and counts several earlier failures", () => {
    const shipped = ago(4 * DAY);
    const failing = buildDigest(
      [
        deploy({
          id: "api",
          service: "belture-api",
          finishedAt: ago(5 * HOUR),
          rollbackAt: ago(4 * HOUR),
        }),
      ],
      "production",
      now,
    );
    expect(failing.headline).toBe("One of the latest production deploys needs attention.");
    expect(failing.claims[0]?.text).toBe(
      "shipped 5 hours ago and was rolled back 1 hour later, so it counts as failed.",
    );

    const several = buildDigest(
      [
        deploy({
          id: "latest-api",
          service: "belture-api",
          kind: "hotfix",
          finishedAt: ago(2 * DAY),
        }),
        deploy({
          id: "latest-web",
          service: "belture-frontend",
          kind: "rollback",
          finishedAt: ago(2 * DAY),
        }),
        deploy({ id: "a", service: "belture-api", finishedAt: shipped, hotfixAt: ago(3 * DAY) }),
        deploy({
          id: "b",
          service: "belture-frontend",
          finishedAt: shipped,
          rollbackAt: ago(4 * DAY - 2 * HOUR),
        }),
      ],
      "production",
      now,
    );
    expect(several.headline).toBe("Production looks fine so far; two earlier deploys failed.");
    expect(several.claims.map((claim) => claim.text.split(";")[0])).toEqual([
      "is a hotfix",
      "is a rollback",
      "shipped Sunday at 15:00 and needed a hotfix 24 hours later, so it counts as failed.",
      "shipped Sunday at 15:00 and was rolled back 2 hours later, so it counts as failed.",
    ]);
  });

  it("calls production clean when every watch has passed", () => {
    const digest = buildDigest(
      [deploy({ id: "a", service: "belture-api", finishedAt: ago(5 * DAY) })],
      "production",
      now,
    );
    expect(digest.headline).toBe(
      "Production is clean: every latest deploy passed its 72-hour watch.",
    );
    expect(digest.claims[0]?.text).toBe(
      "shipped Saturday at 15:00 and needed no hotfix or rollback in its 72-hour watch.",
    );
  });

  it("only says when other environments got their latest deploy", () => {
    const digest = buildDigest(
      [
        deploy({
          id: "s",
          service: "belture-api",
          environment: "staging",
          finishedAt: ago(3 * HOUR),
        }),
        deploy({
          id: "w",
          service: "belture-frontend",
          environment: "staging",
          shippedBy: null,
          finishedAt: ago(5 * HOUR),
        }),
      ],
      "staging",
      now,
    );
    expect(digest).toEqual({
      headline: "The latest staging deploy went out 3 hours ago.",
      claims: [
        {
          deployId: "s",
          subject: "belture-api 1.0.0",
          tone: "deployed",
          text: "reached staging 3 hours ago, merged by aleja-mora.",
        },
        {
          deployId: "w",
          subject: "belture-frontend 1.0.0",
          tone: "deployed",
          text: "reached staging 5 hours ago.",
        },
      ],
    });
  });
});
