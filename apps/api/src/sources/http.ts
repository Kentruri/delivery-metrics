import type { z } from "zod";

export type Fetcher = (input: URL, init?: RequestInit) => Promise<Response>;

export class SourceError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

const RETRIES = 3;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (response: Response, attempt: number) => {
  const after = Number(response.headers.get("retry-after"));
  return Number.isFinite(after) && after > 0 ? after * 1000 : 1000 * 2 ** attempt;
};

export interface JsonClient {
  get: <T extends z.ZodType>(path: string, schema: T) => Promise<z.infer<T>>;
  post: <T extends z.ZodType>(path: string, body: unknown, schema: T) => Promise<z.infer<T>>;
}

export const createJsonClient = (
  origin: string,
  headers: Record<string, string>,
  fetcher: Fetcher = fetch,
  sleep: (ms: number) => Promise<unknown> = wait,
): JsonClient => {
  const send = async <T extends z.ZodType>(path: string, schema: T, init: RequestInit) => {
    const url = new URL(path, origin);
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetcher(url, {
        ...init,
        headers: { accept: "application/json", ...headers, ...init.headers },
      });
      if ((response.status === 429 || response.status >= 500) && attempt < RETRIES) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      if (!response.ok) {
        throw new SourceError(
          `${url.host} answered ${response.status} for ${url.pathname}`,
          response.status,
        );
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) {
        throw new SourceError(
          `${url.host} sent an unexpected answer for ${url.pathname}: ${parsed.error.message}`,
        );
      }
      return parsed.data as z.infer<T>;
    }
  };

  return {
    get: (path, schema) => send(path, schema, { method: "GET" }),
    post: (path, body, schema) =>
      send(path, schema, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
  };
};

// Hosts send local times without an offset; they are UTC.
export const parseTime = (value: string): number => {
  const normalised = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const time = Date.parse(normalised);
  if (Number.isNaN(time)) {
    throw new SourceError(`Unreadable time: ${value}`);
  }
  return time;
};
