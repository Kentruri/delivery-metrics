import { describe, expect, it } from "vitest";
import {
  formatAgo,
  formatDecimal,
  formatHours,
  formatShare,
  formatShortSpan,
  formatSpan,
  listJoin,
} from "./format";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const now = new Date(2026, 9, 29, 15, 0);

describe("formatAgo", () => {
  it("counts minutes within the hour", () => {
    expect(formatAgo(new Date(2026, 9, 29, 14, 48), now)).toBe("12 minutes ago");
    expect(formatAgo(new Date(2026, 9, 29, 14, 59, 50), now)).toBe("1 minute ago");
  });

  it("counts hours on the same day", () => {
    expect(formatAgo(new Date(2026, 9, 29, 11, 50), now)).toBe("3 hours ago");
  });

  it("says yesterday with the clock time", () => {
    expect(formatAgo(new Date(2026, 9, 28, 16, 5), now)).toBe("yesterday at 16:05");
  });

  it("names the weekday within the week", () => {
    expect(formatAgo(new Date(2026, 9, 26, 9, 12), now)).toBe("Monday at 09:12");
  });

  it("falls back to the date", () => {
    expect(formatAgo(new Date(2026, 9, 12, 10, 0), now)).toBe("on 12 Oct");
  });
});

describe("formatSpan", () => {
  it("uses minutes, hours or days", () => {
    expect(formatSpan(40 * MINUTE)).toBe("40 minutes");
    expect(formatSpan(HOUR)).toBe("1 hour");
    expect(formatSpan(26 * HOUR)).toBe("26 hours");
    expect(formatSpan(69 * HOUR)).toBe("69 hours");
    expect(formatSpan(72 * HOUR)).toBe("3 days");
  });
});

describe("formatShortSpan", () => {
  it("abbreviates minutes and hours", () => {
    expect(formatShortSpan(45 * MINUTE)).toBe("45 min");
    expect(formatShortSpan(46 * HOUR)).toBe("46 h");
  });
});

describe("formatHours", () => {
  it("uses minutes, then hours, then days with one decimal", () => {
    expect(formatHours(0.4)).toBe("24 min");
    expect(formatHours(19.4)).toBe("19 h");
    expect(formatHours(57.6)).toBe("2.4 d");
    expect(formatHours(72)).toBe("3 d");
  });
});

describe("stacked figures", () => {
  it("rounds shares and decimals", () => {
    expect(formatShare(1 / 3)).toBe("33%");
    expect(formatDecimal(4.846)).toBe("4.8");
    expect(formatDecimal(2)).toBe("2");
  });
});

describe("listJoin", () => {
  it("joins names the way a sentence lists them", () => {
    expect(listJoin([])).toBe("");
    expect(listJoin(["Netlify"])).toBe("Netlify");
    expect(listJoin(["GitHub", "Netlify", "Forge"])).toBe("GitHub, Netlify and Forge");
  });
});
