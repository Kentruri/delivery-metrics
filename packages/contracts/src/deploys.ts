import { z } from "zod";
import { defineEndpoint } from "./endpoint.js";

const timestamp = z.iso.datetime({ offset: true });

export const environmentSchema = z.enum(["production", "staging", "develop"]);
export const sourceSchema = z.enum(["Netlify", "Forge", "GitHub"]);

// release: the release-please version bump, which reaches production after the change it tags.
// redeploy: the same commit deployed again. Neither is counted as a deploy.
export const deployKindSchema = z.enum([
  "change",
  "hotfix",
  "rollback",
  "dependency",
  "release",
  "redeploy",
]);

export const conflictKindSchema = z.enum([
  "no_host_record",
  "no_github_record",
  "tag_without_deploy",
]);

export const changeSchema = z.object({
  kind: z.enum(["feature", "fix"]),
  title: z.string(),
  ticket: z.string().nullable(),
  pullNumber: z.number().int(),
});

export const deploySchema = z.object({
  id: z.string(),
  repo: z.string(),
  environment: environmentSchema,
  source: sourceSchema,
  status: z.enum(["succeeded", "failed"]),
  kind: deployKindSchema,
  counted: z.boolean(),
  sha: z.string().nullable(),
  version: z.string(),
  finishedAt: timestamp,
  triggeredBy: z.string().nullable(),
  title: z.string(),
  pullNumber: z.number().int().nullable(),
  leadTimesHours: z.array(z.number().nonnegative()),
  changes: z.array(changeSchema),
  internalChanges: z.number().int().nonnegative(),
  hotfixAt: timestamp.nullable(),
  rollbackAt: timestamp.nullable(),
  conflict: conflictKindSchema.nullable(),
});

export const conflictSchema = z.object({
  id: z.string(),
  repo: z.string(),
  environment: environmentSchema,
  kind: conflictKindSchema,
  ref: z.string(),
  at: timestamp,
  detail: z.string(),
});

export const sourceStatusSchema = z.object({
  repo: z.string(),
  source: sourceSchema,
  connected: z.boolean(),
  coversFrom: timestamp.nullable(),
  syncedAt: timestamp.nullable(),
});

export const historyQuerySchema = z.object({
  environment: environmentSchema.default("production"),
});

export const historyResponseSchema = z.object({
  since: timestamp,
  generatedAt: timestamp,
  windowHours: z.number().int().positive(),
  repos: z.array(z.object({ name: z.string(), host: sourceSchema })),
  sources: z.array(sourceStatusSchema),
  deploys: z.array(deploySchema),
  conflicts: z.array(conflictSchema),
});

export type Environment = z.infer<typeof environmentSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type DeployKind = z.infer<typeof deployKindSchema>;
export type ConflictKind = z.infer<typeof conflictKindSchema>;
export type Change = z.infer<typeof changeSchema>;
export type Deploy = z.infer<typeof deploySchema>;
export type Conflict = z.infer<typeof conflictSchema>;
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;

export const historyEndpoint = defineEndpoint({
  method: "GET",
  path: "/v1/history",
  query: historyQuerySchema,
  response: historyResponseSchema,
});

export const exportQuerySchema = z.object({
  environment: z.union([environmentSchema, z.literal("all")]).default("all"),
});

export const deploysCsvPath = "/v1/export/deploys.csv";
export const summaryCsvPath = "/v1/export/summary.csv";
