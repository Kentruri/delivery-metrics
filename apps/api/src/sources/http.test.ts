import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createJsonClient, type Fetcher, parseTime, SourceError } from "./http.js";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

describe("createJsonClient", () => {
  it("sends the headers, parses the answer and posts JSON", async () => {
    const fetcher = vi.fn<Fetcher>(async () => json({ ok: true }));
    const client = createJsonClient(
      "https://api.example.com",
      { authorization: "Bearer t" },
      fetcher,
    );

    expect(await client.get("/a?x=1", z.object({ ok: z.boolean() }))).toEqual({ ok: true });
    await client.post("/b", { q: 1 }, z.object({ ok: z.boolean() }));

    const [url, init] = fetcher.mock.calls[1] ?? [];
    expect(String(url)).toBe("https://api.example.com/b");
    expect(init).toMatchObject({
      method: "POST",
      body: '{"q":1}',
      headers: {
        authorization: "Bearer t",
        accept: "application/json",
        "content-type": "application/json",
      },
    });
  });

  it("retries rate limits and server errors, honouring Retry-After", async () => {
    const sleep = vi.fn(async () => {});
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(json({}, 429, { "retry-after": "2" }))
      .mockResolvedValueOnce(json({}, 502))
      .mockResolvedValueOnce(json({ ok: true }));
    const client = createJsonClient("https://api.example.com", {}, fetcher, sleep);

    expect(await client.get("/a", z.object({ ok: z.boolean() }))).toEqual({ ok: true });
    expect(sleep.mock.calls).toEqual([[2000], [2000]]);
  });

  it("fails on an error status or an answer that breaks the schema", async () => {
    const client = createJsonClient(
      "https://api.example.com",
      {},
      vi
        .fn<Fetcher>()
        .mockResolvedValueOnce(json({}, 404))
        .mockResolvedValueOnce(json({ ok: 1 })),
    );
    await expect(client.get("/missing", z.object({}))).rejects.toThrow(
      new SourceError("api.example.com answered 404 for /missing", 404),
    );
    await expect(client.get("/odd", z.object({ ok: z.boolean() }))).rejects.toThrow(
      /unexpected answer for \/odd/,
    );
  });
});

describe("parseTime", () => {
  it("reads ISO times and treats bare host times as UTC", () => {
    expect(parseTime("2026-10-28T18:41:45Z")).toBe(Date.UTC(2026, 9, 28, 18, 41, 45));
    expect(parseTime("2026-10-28T20:41:45+02:00")).toBe(Date.UTC(2026, 9, 28, 18, 41, 45));
    expect(parseTime("2026-10-28 18:41:45")).toBe(Date.UTC(2026, 9, 28, 18, 41, 45));
    expect(() => parseTime("soon")).toThrow(SourceError);
  });
});
