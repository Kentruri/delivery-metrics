import { type Endpoint, errorResponseSchema } from "@cloudnonic/delivery-contracts";
import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  query?: Record<string, string>;
  body?: unknown;
}

// The web host proxies /api/* to the API, so the session cookie stays first-party.
export const request = async <TResponse extends z.ZodType>(
  endpoint: Endpoint<TResponse, z.ZodType | undefined, z.ZodType | undefined>,
  { query, body }: RequestOptions = {},
): Promise<z.infer<TResponse>> => {
  const search = query ? `?${new URLSearchParams(query)}` : "";
  const response = await fetch(`/api${endpoint.path}${search}`, {
    method: endpoint.method,
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const answer = errorResponseSchema.safeParse(await response.json().catch(() => null));
    throw new ApiError(
      answer.success
        ? answer.data.error
        : `${endpoint.method} ${endpoint.path} answered ${response.status}`,
      response.status,
    );
  }
  return endpoint.response.parse(await response.json());
};

export const exportUrl = (path: string, environment: string) =>
  `/api${path}?${new URLSearchParams({ environment })}`;
