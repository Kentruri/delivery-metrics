import type { z } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint<
  TResponse extends z.ZodType = z.ZodType,
  TQuery extends z.ZodType | undefined = undefined,
  TBody extends z.ZodType | undefined = undefined,
> {
  method: HttpMethod;
  path: `/v1/${string}`;
  response: TResponse;
  query?: TQuery;
  body?: TBody;
}

export const defineEndpoint = <
  TResponse extends z.ZodType,
  TQuery extends z.ZodType | undefined = undefined,
  TBody extends z.ZodType | undefined = undefined,
>(
  endpoint: Endpoint<TResponse, TQuery, TBody>,
): Endpoint<TResponse, TQuery, TBody> => endpoint;
