import { z } from "zod";
import { defineEndpoint } from "./endpoint.js";

export const loginBodySchema = z.object({ password: z.string().min(1).max(200) });

export const sessionResponseSchema = z.object({ authenticated: z.boolean() });

export const errorResponseSchema = z.object({ error: z.string() });

export type LoginBody = z.infer<typeof loginBodySchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const loginEndpoint = defineEndpoint({
  method: "POST",
  path: "/v1/session",
  body: loginBodySchema,
  response: sessionResponseSchema,
});

export const sessionEndpoint = defineEndpoint({
  method: "GET",
  path: "/v1/session",
  response: sessionResponseSchema,
});

export const logoutEndpoint = defineEndpoint({
  method: "DELETE",
  path: "/v1/session",
  response: sessionResponseSchema,
});
