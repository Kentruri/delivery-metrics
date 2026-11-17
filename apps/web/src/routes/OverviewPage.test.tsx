import type { Deploy, HistoryResponse } from "@cloudnonic/delivery-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OverviewPage } from "./OverviewPage";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 10, 9, 15, 0);
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const deploy = (
  fields: Partial<Deploy> & Pick<Deploy, "id" | "repo" | "version" | "finishedAt">,
): Deploy => ({
  environment: "production",
  source: "GitHub",
  status: "succeeded",
  kind: "change",
  counted: true,
  sha: "abc1234",
  triggeredBy: "Kentruri",
  title: "Staging",
  pullNumber: null,
  leadTimesHours: [20],
  changes: [],
  internalChanges: 0,
  hotfixAt: null,
  rollbackAt: null,
  conflict: null,
  ...fields,
});

const historyOf = (deploys: Deploy[]): HistoryResponse => ({
  since: "2026-01-01T00:00:00.000Z",
  generatedAt: ago(10 * HOUR),
  windowHours: 72,
  repos: [
    { name: "belture-frontend", host: "Netlify" },
    { name: "belture-api", host: "Forge" },
  ],
  sources: [
    {
      repo: "belture-api",
      source: "Forge",
      connected: true,
      coversFrom: "2026-08-01T00:00:00.000Z",
      syncedAt: ago(10 * HOUR),
    },
    {
      repo: "belture-frontend",
      source: "Netlify",
      connected: false,
      coversFrom: null,
      syncedAt: null,
    },
  ],
  deploys,
  conflicts: [],
});

const production = historyOf([
  deploy({
    id: "forge:2",
    repo: "belture-api",
    version: "3.99.0",
    source: "Forge",
    finishedAt: ago(3 * HOUR),
    pullNumber: 2150,
    changes: [
      { kind: "feature", title: "Penalty carry-over", ticket: "TEN-4208", pullNumber: 2148 },
    ],
    internalChanges: 1,
  }),
  deploy({
    id: "github:bump",
    repo: "belture-api",
    version: "3.100.0",
    kind: "release",
    counted: false,
    finishedAt: ago(HOUR),
  }),
  deploy({
    id: "github:hotfix",
    repo: "belture-frontend",
    version: "3.112.1",
    kind: "hotfix",
    finishedAt: ago(26 * HOUR),
  }),
  deploy({
    id: "github:broken",
    repo: "belture-frontend",
    version: "3.112.0",
    finishedAt: ago(3 * DAY + 2 * HOUR),
    hotfixAt: ago(26 * HOUR),
  }),
]);

const staging = historyOf([
  deploy({
    id: "forge:staging",
    repo: "belture-api",
    environment: "staging",
    source: "Forge",
    version: "3.99.0",
    finishedAt: ago(HOUR),
  }),
]);

const PRODUCTION_HEADLINE =
  "Production looks fine so far; an earlier belture-frontend deploy needed a hotfix.";

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const gate = () => {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
};

const serve = (routes: Record<string, Handler>) => {
  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input, "http://board.test");
    const route = routes[`${init.method ?? "GET"} ${url.pathname}`];
    if (!route) {
      throw new Error(`No route for ${init.method} ${url.pathname}`);
    }
    return route(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const SIGNED_IN: Record<string, Handler> = {
  "GET /api/v1/session": () => json({ authenticated: true }),
  "GET /api/v1/history": (url) =>
    json(url.searchParams.get("environment") === "staging" ? staging : production),
  "DELETE /api/v1/session": () => json({ authenticated: false }),
};

const callsTo = (fetchMock: ReturnType<typeof serve>, method: string, path: string) =>
  fetchMock.mock.calls.filter(
    ([input, init]) => (init?.method ?? "GET") === method && input.startsWith(`/api${path}`),
  );

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}
    >
      <OverviewPage />
    </QueryClientProvider>,
  );

const findHeadline = (name: string) => screen.findByRole("heading", { level: 1, name });

describe("OverviewPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("leads with the latest production deploys, the sources and the downloads", async () => {
    serve(SIGNED_IN);
    renderPage();
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");

    expect(await findHeadline(PRODUCTION_HEADLINE)).toBeTruthy();
    expect(screen.getByText("Tensorparc")).toBeTruthy();
    expect(screen.getByText("Synced 10 hours ago")).toBeTruthy();
    expect(
      screen.getByText(
        "Netlify is not connected yet: deploys come from GitHub merges, and conflicts with the host cannot be checked.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "belture-api 3.99.0" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "#2150 (opens GitHub)" }).getAttribute("href")).toBe(
      "https://github.com/TensorParc-Inc/belture-api/pull/2150",
    );
    expect(
      screen.getByText("Plus 1 internal change: refactors, chores, CI and tooling."),
    ).toBeTruthy();
    expect(screen.queryByText("3.100.0")).toBeNull();
    expect(screen.getByRole("heading", { name: "By period" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Every deploy" }).getAttribute("href")).toBe(
      "/api/v1/export/deploys.csv?environment=all",
    );
    expect(screen.getByRole("link", { name: "By month" }).getAttribute("href")).toBe(
      "/api/v1/export/summary.csv?environment=all",
    );
    expect(
      screen.getByText(
        "GitHub and Forge agree on every production deploy. Netlify is not connected yet, so its deploys are not checked.",
      ),
    ).toBeTruthy();
  });

  it("highlights the row behind a claim", async () => {
    serve(SIGNED_IN);
    renderPage();

    fireEvent.mouseEnter(await screen.findByRole("link", { name: "belture-api 3.99.0" }));
    expect(document.getElementById("deploy-forge:2")?.className).toContain("bg-highlight");
  });

  it("separates one repo from the other across the board", async () => {
    serve(SIGNED_IN);
    renderPage();
    await findHeadline(PRODUCTION_HEADLINE);
    const repo = screen.getByRole("combobox", { name: "Repo" });

    fireEvent.change(repo, { target: { value: "belture-api" } });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Production looks fine so far. One deploy is still in its watch window.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "belture-api 3.99.0" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "belture-frontend 3.112.0" })).toBeNull();
    expect(screen.getByText("GitHub and Forge agree on every production deploy.")).toBeTruthy();

    fireEvent.change(repo, { target: { value: "all" } });
    expect(await findHeadline(PRODUCTION_HEADLINE)).toBeTruthy();
  });

  it("dims the board while another environment loads, then shows it", async () => {
    const stagingReady = gate();
    serve({
      ...SIGNED_IN,
      "GET /api/v1/history": async (url) => {
        if (url.searchParams.get("environment") !== "staging") {
          return json(production);
        }
        await stagingReady.opened;
        return json(staging);
      },
    });
    renderPage();
    await findHeadline(PRODUCTION_HEADLINE);

    fireEvent.change(screen.getByRole("combobox", { name: "Environment" }), {
      target: { value: "staging" },
    });
    const dimmed = screen.getByRole("heading", { level: 1 });
    expect(dimmed.textContent).toBe(PRODUCTION_HEADLINE);
    expect(dimmed.closest(".opacity-60")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Latest deploys to production" })).toBeTruthy();

    stagingReady.open();
    const shown = await findHeadline("The latest staging deploy went out 1 hour ago.");
    expect(shown.closest(".opacity-60")).toBeNull();
    expect(screen.getByRole("heading", { name: "Latest deploys to staging" })).toBeTruthy();
  });

  it("asks for the shared password and opens the board once it is right", async () => {
    const fetchMock = serve({
      ...SIGNED_IN,
      "GET /api/v1/session": () => json({ authenticated: false }),
      "POST /api/v1/session": (_, init) =>
        JSON.parse(String(init.body)).password === "right"
          ? json({ authenticated: true })
          : json({ error: "Wrong password" }, 401),
    });
    renderPage();

    const password = await screen.findByLabelText("Password");
    fireEvent.change(password, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Wrong password");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(callsTo(fetchMock, "GET", "/v1/history")).toHaveLength(0);

    fireEvent.change(password, { target: { value: "right" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await findHeadline(PRODUCTION_HEADLINE)).toBeTruthy();
    expect(callsTo(fetchMock, "POST", "/v1/session").map(([, init]) => init?.body)).toEqual([
      '{"password":"wrong"}',
      '{"password":"right"}',
    ]);
  });

  it("sends the reader back to sign in when the session expires", async () => {
    const fetchMock = serve({
      ...SIGNED_IN,
      "GET /api/v1/history": () => json({ error: "Sign in again" }, 401),
    });
    renderPage();

    expect(await screen.findByLabelText("Password")).toBeTruthy();
    expect(callsTo(fetchMock, "GET", "/v1/history")).toHaveLength(1);
  });

  it("shows a skeleton while the history loads, then the error, and tries again", async () => {
    const firstAnswer = gate();
    let calls = 0;
    serve({
      ...SIGNED_IN,
      "GET /api/v1/history": async () => {
        calls += 1;
        if (calls === 1) {
          await firstAnswer.opened;
        }
        return calls <= 3 ? json({ error: "Database is down" }, 500) : json(production);
      },
    });
    renderPage();

    expect(await screen.findByText("Loading the history")).toBeTruthy();
    firstAnswer.open();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("The history did not load.");
    expect(alert.textContent).toContain("Database is down");
    expect(calls).toBe(3);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await findHeadline(PRODUCTION_HEADLINE)).toBeTruthy();
  });

  it("says when the API is unreachable, and tries again", async () => {
    let calls = 0;
    serve({
      ...SIGNED_IN,
      "GET /api/v1/session": () => {
        calls += 1;
        return calls === 1
          ? new Response("<html>Bad gateway</html>", { status: 502 })
          : json({ authenticated: true });
      },
    });
    renderPage();

    expect(
      await screen.findByText(
        "The API is not answering. It may be waking up; try again in a minute.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await findHeadline(PRODUCTION_HEADLINE)).toBeTruthy();
  });

  it("signs out", async () => {
    const fetchMock = serve(SIGNED_IN);
    renderPage();
    await findHeadline(PRODUCTION_HEADLINE);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByLabelText("Password")).toBeTruthy();
    expect(callsTo(fetchMock, "DELETE", "/v1/session")).toHaveLength(1);
  });
});
