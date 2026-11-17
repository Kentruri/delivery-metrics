import { describe, expect, it } from "vitest";
import {
  type Claim,
  cadenceClaim,
  capitalize,
  currentLabel,
  failureClaim,
  leadTimeClaim,
  previousPhrase,
  productionOnlyClaim,
  shippedClaim,
} from "./claims";
import type { PeriodFilters, PeriodReport, PeriodStats } from "./model";

const now = new Date(2026, 9, 30, 14, 0);
const phrase = "the 3 months before";

const stats = (fields: Partial<PeriodStats> = {}): PeriodStats => ({
  days: 91,
  deploys: 41,
  releaseDays: 37,
  commits: 100,
  leadTime: { p50: 17, p85: 42 },
  leadTimeBins: [0, 0, 0, 0, 0, 0, 0],
  failure: { failed: 2, clean: 37, watching: 2 },
  features: 23,
  fixes: 31,
  ...fields,
});

const report = (
  current: Partial<PeriodStats> = {},
  before: Partial<PeriodStats> | null = {},
): PeriodReport => ({
  range: { start: new Date(2026, 7, 1), end: now },
  previous: { start: new Date(2026, 4, 1), end: new Date(2026, 6, 30, 14, 0) },
  groupBy: "week",
  buckets: [],
  previousBuckets: [],
  outcomes: [],
  current: stats(current),
  before:
    before === null
      ? null
      : stats({
          deploys: 57,
          releaseDays: 44,
          leadTime: { p50: 22, p85: 48 },
          failure: { failed: 1, clean: 50, watching: 0 },
          features: 15,
          fixes: 20,
          ...before,
        }),
});

const text = (claim: Claim) => claim.map((part) => part.text).join("");
const strong = (claim: Claim) => claim.filter((part) => part.strong).map((part) => part.text);

describe("cadenceClaim", () => {
  it("says how often production got a deploy, against the period before", () => {
    const claim = cadenceClaim(report(), phrase);
    expect(text(claim)).toBe(
      "41 deploys on 37 days, about 3 a week: 16 fewer than the 3 months before (57).",
    );
    expect(strong(claim)).toEqual(["41 deploys"]);
    expect(text(cadenceClaim(report({ deploys: 60 }), phrase))).toBe(
      "60 deploys on 37 days, about 5 a week: 3 more than the 3 months before (57).",
    );
    expect(text(cadenceClaim(report({ deploys: 57 }), phrase))).toBe(
      "57 deploys on 37 days, about 4 a week: as many as the 3 months before.",
    );
  });

  it("falls back to months, and says when the period before has no data", () => {
    expect(text(cadenceClaim(report({ deploys: 2, releaseDays: 2 }, null), phrase))).toBe(
      "2 deploys on 2 days, about 1 a month: no data for the 3 months before.",
    );
    expect(text(cadenceClaim(report({ deploys: 1, releaseDays: 1 }), phrase))).toBe(
      "1 deploy on 1 day, less than one a month: 56 fewer than the 3 months before (57).",
    );
  });
});

describe("leadTimeClaim", () => {
  it("gives the median and the 85th percentile, and how the median moved", () => {
    const claim = leadTimeClaim(report(), phrase);
    expect(text(claim)).toBe(
      "Half of the changes reached production within 17 h, and 85% within 42 h: 5 h faster than the 3 months before (22 h).",
    );
    expect(strong(claim)).toEqual(["within 17 h"]);
    expect(text(leadTimeClaim(report({ leadTime: { p50: 30, p85: 60 } }), phrase))).toBe(
      "Half of the changes reached production within 30 h, and 85% within 2.5 d: 8 h slower than the 3 months before (22 h).",
    );
    expect(text(leadTimeClaim(report({ leadTime: { p50: 22.4, p85: 40 } }), phrase))).toBe(
      "Half of the changes reached production within 22 h, and 85% within 40 h: about as fast as the 3 months before.",
    );
  });

  it("handles ranges without changes or without earlier data", () => {
    expect(text(leadTimeClaim(report({ leadTime: null }), phrase))).toBe(
      "No changes reached production in this range.",
    );
    expect(text(leadTimeClaim(report({}, { leadTime: null }), phrase))).toBe(
      "Half of the changes reached production within 17 h, and 85% within 42 h: no data for the 3 months before.",
    );
  });
});

describe("failureClaim", () => {
  it("counts failed deploys against the period before", () => {
    const claim = failureClaim(report(), phrase);
    expect(text(claim)).toBe("2 of 39 deploys failed (5%); against 1 of 51 the 3 months before.");
    expect(strong(claim)).toEqual(["2 of 39 deploys failed"]);
    expect(
      text(failureClaim(report({ failure: { failed: 0, clean: 39, watching: 0 } }), phrase)),
    ).toBe(
      "No deploy failed out of 39 with a finished watch; against 1 of 51 the 3 months before.",
    );
  });

  it("says when the period before has no finished watch, no deploys or no data", () => {
    const stillWatching = { failure: { failed: 0, clean: 0, watching: 3 } };
    expect(text(failureClaim(report({}, stillWatching), phrase))).toBe(
      "2 of 39 deploys failed (5%); no finished watch the 3 months before.",
    );
    const noDeploys = { deploys: 0, failure: { failed: 0, clean: 0, watching: 0 } };
    expect(text(failureClaim(report({}, noDeploys), phrase))).toBe(
      "2 of 39 deploys failed (5%); no deploys the 3 months before.",
    );
    expect(text(failureClaim(report({}, null), phrase))).toBe(
      "2 of 39 deploys failed (5%); no data for the 3 months before.",
    );
  });

  it("waits while every deploy is still in its watch", () => {
    const claim = failureClaim(report({ failure: { failed: 0, clean: 0, watching: 2 } }), phrase);
    expect(text(claim)).toBe("No finished watch yet: 2 deploys are still in their 72-hour watch.");
    expect(strong(claim)).toEqual(["No finished watch yet"]);
    expect(
      text(failureClaim(report({ failure: { failed: 0, clean: 0, watching: 1 } }), phrase)),
    ).toBe("No finished watch yet: 1 deploy is still in its 72-hour watch.");
  });
});

describe("shippedClaim", () => {
  it("counts features and fixes against the period before", () => {
    expect(text(shippedClaim(report(), phrase))).toBe(
      "23 features and 31 fixes shipped, against 15 and 20 the 3 months before.",
    );
    expect(text(shippedClaim(report({ features: 1, fixes: 1 }, null), phrase))).toBe(
      "1 feature and 1 fix shipped; no data for the 3 months before.",
    );
  });
});

describe("labels", () => {
  const filters: PeriodFilters = {
    preset: "custom",
    from: "",
    to: "",
    groupBy: "week",
  };

  it("names the range and the period before it", () => {
    const custom = {
      ...report(),
      previous: { start: new Date(2026, 7, 30), end: new Date(2026, 8, 10) },
    };
    expect(previousPhrase(filters, custom)).toBe("the 11 days before");
    expect(previousPhrase({ ...filters, preset: "this-year" }, report())).toBe(
      "the same days last year",
    );
    expect(currentLabel(filters)).toBe("Selected range");
    expect(currentLabel({ ...filters, preset: "last-3-months" })).toBe("Last 3 months");
    expect(capitalize(phrase)).toBe("The 3 months before");
    expect(text(productionOnlyClaim("Lead time"))).toBe(
      "Lead time is measured on production deploys only.",
    );
  });
});
