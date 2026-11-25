import { z } from "zod";
import { defineEndpoint } from "./endpoint.js";

export const healthResponseSchema = z.object({ status: z.literal("ok") });

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const healthEndpoint = defineEndpoint({
  method: "GET",
  path: "/v1/health",
  response: healthResponseSchema,
});
