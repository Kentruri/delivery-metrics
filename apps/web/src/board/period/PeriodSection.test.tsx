import { FAILURE_RULE } from "@cloudnonic/delivery-contracts";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ChangeItem } from "../model";
import type { DeployHistory, HistoryDeploy } from "./model";
import { PeriodSection } from "./PeriodSection";

const now = new Date(2026, 9, 30, 14, 0);
const at = (month: number, date: number, hour = 10, minute = 0) =>
  new Date(2026, month, date, hour, minute);

const changes = (features: number, fixes: number) => ({
  items: [
    ...Array.from(
      { length: features },
      (_, index): ChangeItem => ({
        kind: "feature",
        title: `Feature ${index}`,
        ticket: null,
        pullNumber: index + 1,
      }),
    ),
    ...Array.from(
      { length: fixes },
      (_, index): ChangeItem => ({
        kind: "fix",
        title: `Fix ${index}`,
        ticket: null,
        pullNumber: index + 100,
      }),
    ),
  ],
  internalCount: 0,
});

const deploy = (
  id: string,
  finishedAt: Date,
  fields: Partial<HistoryDeploy> = {},
): HistoryDeploy => ({
  id,
  service: "belture-api",
  environment: "production",
  source: "Forge",
  status: "succeeded",
  kind: "change",
  counted: true,
  version: id,
  sha: id,
  shippedBy: null,
  title: "Staging",
  pullNumber: null,
  finishedAt,
  leadTimesHours: [12, 30],
  changes: changes(1, 2),
  conflict: null,
  ...fields,
});

const history: DeployHistory = {
  since: new Date(2026, 4, 1),
  deploys: [
    deploy("may", at(4, 12), { leadTimesHours: [6, 8], changes: changes(2, 1) }),
    deploy("aug", at(7, 4), { leadTimesHours: [12, 400] }),
    deploy("sep", at(8, 8), { hotfixAt: at(8, 9) }),
    deploy("rollback", at(8, 15), { rollbackAt: at(8, 15, 12) }),
    deploy("late-hotfix", at(8, 22), { hotfixAt: at(8, 24) }),
    deploy("quick-rollback", at(9, 6), { rollbackAt: at(9, 6, 10, 40) }),
    deploy("hotfix-two", at(9, 13), { hotfixAt: at(9, 14) }),
    deploy("web", at(9, 27), { service: "belture-frontend" }),
    deploy("watching", at(9, 30, 9)),
  ],
};

const renderSection = (environment = "production", source = history) =>
  render(<PeriodSection history={source} environment={environment} now={now} />);

const chooseRange = (value: string) =>
  fireEvent.change(screen.getByRole("combobox", { name: "Range" }), { target: { value } });

const sentence = (expected: string) =>
  screen.getByText((_, element) => element?.tagName === "P" && element.textContent === expected);

describe("PeriodSection", () => {
  afterEach(cleanup);

  it("answers each question in a sentence, against the period before", () => {
    renderSection();

    expect(screen.getByText("1 Aug – 30 Oct 2026, by week")).toBeTruthy();
    expect(screen.getByText("The 3 months before, 1 May – 30 Jul 2026")).toBeTruthy();
    expect(
      sentence("8 deploys on 8 days, about 3 a month: 7 more than the 3 months before (1)."),
    ).toBeTruthy();
    expect(
      sentence(
        "Half of the changes reached production within 21 h, and 85% within 30 h: 14 h slower than the 3 months before (7 h).",
      ),
    ).toBeTruthy();
    expect(
      sentence("5 of 7 deploys failed (71%); against 0 of 1 the 3 months before."),
    ).toBeTruthy();
    expect(
      sentence("8 features and 16 fixes shipped, against 2 and 1 the 3 months before."),
    ).toBeTruthy();
    expect(screen.getByText(FAILURE_RULE)).toBeTruthy();
  });

  it("reads a week of either period from the deploys chart", () => {
    renderSection();
    const chart = screen.getByRole("slider", { name: "Deploys by week" });

    fireEvent.mouseMove(chart, { clientX: 45 });
    expect(chart.getAttribute("aria-valuetext")).toBe(
      "The 3 months before, 11 – 17 May 2026: 1 deploy, 1 of 7 days with a release",
    );
    expect(screen.getByText("1 of 7 days with a release")).toBeTruthy();

    fireEvent.mouseMove(chart, { clientX: 550 });
    expect(chart.getAttribute("aria-valuenow")).toBe("28");

    fireEvent.mouseLeave(chart);
    expect(screen.queryByText("1 of 7 days with a release")).toBeNull();
  });

  it("moves through the weeks with the keyboard", () => {
    renderSection();
    const chart = screen.getByRole("slider", { name: "Deploys by week" });

    fireEvent.focus(chart);
    expect(chart.getAttribute("aria-valuetext")).toBe(
      "26 – 30 Oct 2026: 2 deploys, 2 of 5 days with a release",
    );
    fireEvent.keyDown(chart, { key: "Home" });
    expect(chart.getAttribute("aria-valuetext")).toBe(
      "The 3 months before, 1 – 3 May 2026: 0 deploys, 0 of 3 days with a release",
    );
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(chart.getAttribute("aria-valuenow")).toBe("2");
    fireEvent.keyDown(chart, { key: "End" });
    expect(chart.getAttribute("aria-valuenow")).toBe("28");
    fireEvent.keyDown(chart, { key: "a" });
    fireEvent.keyDown(chart, { key: "Escape" });
    fireEvent.blur(chart);
    expect(screen.queryByText("2 of 5 days with a release")).toBeNull();
  });

  it("shows how long changes take, and how many arrive within a week", () => {
    renderSection();
    const chart = screen.getByRole("img", { name: /^Share of changes/ });

    expect(chart.getAttribute("aria-label")).toContain("4–24 h: 50% (100% before)");
    expect(chart.getAttribute("aria-label")).toContain("2–4 weeks: 6% (0% before)");
    expect(screen.getByText("Within a week: 94%")).toBeTruthy();
    expect(screen.getByText("· 100% before")).toBeTruthy();

    fireEvent.mouseMove(chart, { clientX: 300 });
    expect(screen.getByText("0% the 3 months before")).toBeTruthy();
    fireEvent.mouseLeave(chart);
    expect(screen.queryByText("0% the 3 months before")).toBeNull();
  });

  it("lists what failed and why, and opens the whole list", () => {
    renderSection();

    expect(screen.getByText("2 clean")).toBeTruthy();
    expect(screen.getByText("5 failed")).toBeTruthy();
    expect(screen.getByText("1 watching")).toBeTruthy();
    expect(screen.getByText("Rolled back after 40 minutes")).toBeTruthy();
    expect(screen.getByText("Hotfix after 48 hours")).toBeTruthy();
    expect(screen.getByText("Rolled back after 2 hours")).toBeTruthy();
    expect(screen.getAllByText("Hotfix after 24 hours")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Show all 5 failed deploys" }));
    expect(screen.getAllByText("Hotfix after 24 hours")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.getAllByText("Hotfix after 24 hours")).toHaveLength(1);
  });

  it("shows the same numbers as a table, with gaps before the history", () => {
    renderSection();

    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(17);
    const total = within(table)
      .getByRole("rowheader", { name: "1 Aug – 30 Oct 2026" })
      .closest("tr") as HTMLElement;
    expect(within(total).getByText("5 of 7 (71%)")).toBeTruthy();
    expect(within(total).getByText("16")).toBeTruthy();
    expect(within(table).queryByText("No data")).toBeNull();

    chooseRange("last-12-months");
    expect(within(screen.getByRole("table")).getAllByText("No data")).toHaveLength(7);
  });

  it("changes the range and the grouping, and says what it cannot compare", () => {
    renderSection();

    chooseRange("this-month");
    expect(screen.getByText("1 – 30 Oct 2026, by week")).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Month" }) as HTMLInputElement).disabled).toBe(true);

    chooseRange("last-12-months");
    expect(screen.getByText("1 Nov 2025 – 30 Oct 2026, by month")).toBeTruthy();
    expect(
      sentence("9 deploys on 9 days, about 1 a month: no data for the 12 months before."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    expect(screen.getByText("1 Nov 2025 – 30 Oct 2026, by year")).toBeTruthy();
  });

  it("takes a custom range, starting from the one on screen", () => {
    renderSection();

    chooseRange("custom");
    expect(screen.getAllByText("Selected range").length).toBeGreaterThan(0);
    const from = screen.getByLabelText("From") as HTMLInputElement;
    expect(from.value).toBe("2026-08-01");

    fireEvent.change(from, { target: { value: "2026-10-05" } });
    expect(screen.getByText("5 – 30 Oct 2026, by week")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-20" } });
    expect(screen.getByText("5 – 20 Oct 2026, by week")).toBeTruthy();
    fireEvent.change(from, { target: { value: "" } });
    expect(screen.getByText("5 – 20 Oct 2026, by week")).toBeTruthy();
  });

  it("keeps lead time and failures to production", () => {
    renderSection("staging", {
      ...history,
      deploys: [...history.deploys, deploy("stage", at(9, 2), { environment: "staging" })],
    });

    expect(sentence("Lead time is measured on production deploys only.")).toBeTruthy();
    expect(sentence("The failure rate is measured on production deploys only.")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    expect(screen.getByText("Days with a deploy")).toBeTruthy();
    expect(
      within(screen.getByRole("table")).getAllByText("Production only").length,
    ).toBeGreaterThan(0);
  });

  it("says when nothing shipped in the range, and shows extra actions", () => {
    render(
      <PeriodSection
        history={history}
        environment="staging"
        now={now}
        actions={<a href="/export">Every deploy</a>}
      />,
    );

    expect(screen.getByText("Nothing shipped to staging in this range.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Every deploy" })).toBeTruthy();
  });
});
