import { z } from "zod";
import { sourceSchema } from "./deploys.js";
import { defineEndpoint } from "./endpoint.js";

export const syncReportSchema = z.object({
  startedAt: z.iso.datetime({ offset: true }),
  finishedAt: z.iso.datetime({ offset: true }),
  repos: z.array(
    z.object({
      repo: z.string(),
      deploys: z.number().int().nonnegative(),
      conflicts: z.number().int().nonnegative(),
      sources: z.array(
        z.object({
          source: sourceSchema,
          connected: z.boolean(),
          records: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

export type SyncReport = z.infer<typeof syncReportSchema>;

export const syncEndpoint = defineEndpoint({
  method: "POST",
  path: "/v1/sync",
  response: syncReportSchema,
});
