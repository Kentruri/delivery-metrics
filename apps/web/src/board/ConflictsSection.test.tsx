import type { Conflict } from "@cloudnonic/delivery-contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConflictsSection } from "./ConflictsSection";

const HOSTS = ["Netlify", "Forge"];

const conflicts: Conflict[] = [
  {
    id: "merge:2147",
    repo: "belture-api",
    environment: "production",
    kind: "no_host_record",
    ref: "#2147",
    at: "2026-10-26T12:00:00.000Z",
    detail: "Merged into main, but Forge has no deploy of it.",
  },
  {
    id: "forge:9",
    repo: "belture-api",
    environment: "production",
    kind: "no_github_record",
    ref: "abc1234",
    at: "2026-10-27T12:00:00.000Z",
    detail: "Forge deployed a commit that no pull request merged.",
  },
  {
    id: "tag:belture-api:v3.99.0",
    repo: "belture-api",
    environment: "production",
    kind: "tag_without_deploy",
    ref: "v3.99.0",
    at: "2026-10-28T12:00:00.000Z",
    detail: "Release v3.99.0 (abc1234) has no production deploy in Forge.",
  },
];

const intro = () => screen.getByRole("heading", { name: "Where the sources disagree" }).nextSibling;

describe("ConflictsSection", () => {
  afterEach(cleanup);

  it("waits for the hosts before checking anything", () => {
    render(
      <ConflictsSection
        conflicts={[]}
        environment="production"
        hosts={HOSTS}
        disconnected={HOSTS}
      />,
    );
    expect(intro()?.textContent).toBe(
      "Conflicts are checked once Netlify and Forge are connected; until then every deploy comes from a GitHub merge.",
    );
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("says who agrees, and which host is not checked yet", () => {
    const { rerender } = render(
      <ConflictsSection conflicts={[]} environment="staging" hosts={HOSTS} disconnected={[]} />,
    );
    expect(intro()?.textContent).toBe("GitHub, Netlify and Forge agree on every staging deploy.");

    rerender(
      <ConflictsSection
        conflicts={[]}
        environment="staging"
        hosts={HOSTS}
        disconnected={["Netlify"]}
      />,
    );
    expect(intro()?.textContent).toBe(
      "GitHub and Forge agree on every staging deploy. Netlify is not connected yet, so its deploys are not checked.",
    );
  });

  it("lists every disagreement with a link to its record on GitHub", () => {
    render(
      <ConflictsSection
        conflicts={conflicts}
        environment="production"
        hosts={[...HOSTS, "Render"]}
        disconnected={["Netlify", "Render"]}
      />,
    );
    expect(intro()?.textContent).toBe(
      "3 production records where GitHub and the host tell different stories. They stay on the board and in the CSV; none is resolved silently. Netlify and Render are not connected yet, so their deploys are not checked.",
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.querySelector("time")?.textContent)).toEqual([
      "26 Oct 2026",
      "27 Oct 2026",
      "28 Oct 2026",
    ]);
    expect(screen.getByText("Merged, never deployed")).toBeTruthy();
    expect(screen.getByText("Deployed, never merged")).toBeTruthy();
    expect(screen.getByText("Tagged, never deployed")).toBeTruthy();
    expect(
      screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["#2147(opens GitHub)", "https://github.com/TensorParc-Inc/belture-api/pull/2147"],
      ["abc1234(opens GitHub)", "https://github.com/TensorParc-Inc/belture-api/commit/abc1234"],
      [
        "v3.99.0(opens GitHub)",
        "https://github.com/TensorParc-Inc/belture-api/releases/tag/v3.99.0",
      ],
    ]);
  });

  it("speaks of a single record in the singular", () => {
    render(
      <ConflictsSection
        conflicts={conflicts.slice(0, 1)}
        environment="production"
        hosts={HOSTS}
        disconnected={[]}
      />,
    );
    expect(intro()?.textContent).toBe(
      "1 production record where GitHub and the host tell different stories. They stay on the board and in the CSV; none is resolved silently.",
    );
  });
});
