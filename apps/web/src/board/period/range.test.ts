import { describe, expect, it } from "vitest";
import {
  addMonths,
  allowedGroupings,
  bucketLabel,
  bucketRanges,
  bucketTitle,
  countDays,
  fittingGrouping,
  formatRange,
  parseDay,
  resolveRanges,
  toDayValue,
} from "./range";

const now = new Date(2026, 9, 30, 14, 0);
const day = (month: number, date: number, year = 2026) => new Date(year, month, date);

describe("resolveRanges", () => {
  it("covers the last three calendar months up to now, against the three before", () => {
    expect(resolveRanges({ preset: "last-3-months", from: "", to: "" }, now)).toEqual({
      range: { start: day(7, 1), end: now },
      previous: { start: day(4, 1), end: new Date(2026, 6, 30, 14, 0) },
    });
  });

  it("takes last month whole, against the month before", () => {
    expect(resolveRanges({ preset: "last-month", from: "", to: "" }, now)).toEqual({
      range: { start: day(8, 1), end: day(9, 1) },
      previous: { start: day(7, 1), end: day(8, 1) },
    });
  });

  it("compares this year with the same days of last year", () => {
    expect(resolveRanges({ preset: "this-year", from: "", to: "" }, now).previous).toEqual({
      start: day(0, 1, 2025),
      end: new Date(2025, 9, 30, 14, 0),
    });
  });

  it("reads a custom range in either order, against as many days before it", () => {
    expect(resolveRanges({ preset: "custom", from: "2026-09-20", to: "2026-09-10" }, now)).toEqual({
      range: { start: day(8, 10), end: day(8, 21) },
      previous: { start: day(7, 30), end: day(8, 10) },
    });
  });

  it("never lets a custom range start in the future or end after now", () => {
    expect(
      resolveRanges({ preset: "custom", from: "2027-01-01", to: "not a day" }, now).range,
    ).toEqual({ start: day(9, 30), end: now });
  });
});

describe("addMonths", () => {
  it("keeps the day of the month, or the last day of a shorter month", () => {
    expect(addMonths(day(2, 31), -1)).toEqual(day(1, 28));
    expect(addMonths(day(0, 15), 13)).toEqual(day(1, 15, 2027));
  });
});

describe("bucketRanges", () => {
  it("cuts weeks from Monday and clips the first and last to the range", () => {
    expect(bucketRanges({ start: day(7, 1), end: day(7, 20) }, "week")).toEqual([
      { start: day(7, 1), end: day(7, 3) },
      { start: day(7, 3), end: day(7, 10) },
      { start: day(7, 10), end: day(7, 17) },
      { start: day(7, 17), end: day(7, 20) },
    ]);
  });

  it("cuts calendar months and years", () => {
    expect(
      bucketRanges({ start: day(7, 1), end: now }, "month").map((bucket) => bucket.start),
    ).toEqual([day(7, 1), day(8, 1), day(9, 1)]);
    expect(bucketRanges({ start: day(10, 1, 2025), end: now }, "year")).toEqual([
      { start: day(10, 1, 2025), end: day(0, 1) },
      { start: day(0, 1), end: now },
    ]);
  });
});

describe("groupings", () => {
  it("offers groupings with 2 to 60 buckets, and weeks for any short range", () => {
    expect(allowedGroupings({ start: day(7, 1), end: now })).toEqual(["week", "month"]);
    expect(allowedGroupings({ start: day(9, 1), end: now })).toEqual(["week"]);
    expect(allowedGroupings({ start: day(10, 1, 2025), end: now })).toEqual([
      "week",
      "month",
      "year",
    ]);
    expect(allowedGroupings({ start: day(0, 1, 2024), end: now })).toEqual(["month", "year"]);
  });

  it("keeps the preferred grouping when it fits, or picks one that reads well", () => {
    expect(fittingGrouping({ start: day(7, 1), end: now }, "month")).toBe("month");
    expect(fittingGrouping({ start: day(9, 1), end: now }, "month")).toBe("week");
    expect(fittingGrouping({ start: day(0, 1, 2024), end: now }, "week")).toBe("year");
  });
});

describe("days", () => {
  it("counts the calendar days a range touches", () => {
    expect(countDays({ start: day(7, 1), end: now })).toBe(91);
    expect(countDays({ start: day(7, 1), end: day(7, 3) })).toBe(2);
  });

  it("reads and writes day values", () => {
    expect(toDayValue(day(7, 3))).toBe("2026-08-03");
    expect(parseDay("2026-08-03")).toEqual(day(7, 3));
    expect(parseDay("03/08/2026")).toBeNull();
  });
});

describe("labels", () => {
  it("formats ranges compactly", () => {
    expect(formatRange({ start: day(7, 1), end: now })).toBe("1 Aug – 30 Oct 2026");
    expect(formatRange({ start: day(7, 3), end: day(7, 10) })).toBe("3 – 9 Aug 2026");
    expect(formatRange({ start: day(11, 28, 2025), end: day(0, 4) })).toBe(
      "28 Dec 2025 – 3 Jan 2026",
    );
    expect(formatRange({ start: day(7, 3), end: day(7, 4) })).toBe("3 Aug 2026");
  });

  it("names whole months and years, and spells out partial ones", () => {
    expect(bucketTitle({ start: day(7, 1), end: day(8, 1) }, "month")).toBe("August 2026");
    expect(bucketTitle({ start: day(9, 1), end: now }, "month")).toBe("1 – 30 Oct 2026");
    expect(bucketTitle({ start: day(0, 1, 2025), end: day(0, 1) }, "year")).toBe("2025");
    expect(bucketTitle({ start: day(7, 3), end: day(7, 10) }, "week")).toBe("3 – 9 Aug 2026");
  });

  it("labels the axis by each bucket's start, with the year where it changes", () => {
    expect(bucketLabel({ start: day(7, 3), end: day(7, 10) }, "week", 2)).toBe("3 Aug");
    expect(bucketLabel({ start: day(7, 1), end: day(8, 1) }, "month", 0)).toBe("Aug 2026");
    expect(bucketLabel({ start: day(9, 1), end: now }, "month", 2)).toBe("Oct");
    expect(bucketLabel({ start: day(0, 1), end: day(1, 1) }, "month", 5)).toBe("Jan 2026");
    expect(bucketLabel({ start: day(0, 1), end: now }, "year", 1)).toBe("2026");
  });
});
