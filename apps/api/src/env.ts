import { z } from "zod";

const secret = z.string().min(32);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

// "production=123,staging=456" or a single site id shared by every branch.
const netlifySites = z.string().transform((value, context) => {
  const sites: Record<string, string> = {};
  for (const entry of value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)) {
    const [left, right] = entry.includes("=") ? entry.split("=") : ["*", entry];
    if (!left || !right) {
      context.addIssue({ code: "custom", message: `Invalid Netlify site entry: ${entry}` });
      return z.NEVER;
    }
    sites[left.trim()] = right.trim();
  }
  return sites;
});

// "1146914, 746061": the Forge servers that run the repos' sites.
const serverList = z.string().transform((value) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: optional(z.url()),
    APP_PASSWORD_HASH: optional(z.string().startsWith("scrypt$")),
    SESSION_SECRET: optional(secret),
    SYNC_API_KEY: optional(secret),
    HISTORY_SINCE: z.iso.date().default("2026-01-01"),
    TP_GITHUB_TOKEN: optional(z.string().min(1)),
    TP_NETLIFY_TOKEN: optional(z.string().min(1)),
    TP_NETLIFY_SITES: optional(netlifySites),
    TP_FORGE_TOKEN: optional(z.string().min(1)),
    TP_FORGE_ORG: optional(z.string().min(1)),
    TP_FORGE_SERVERS: optional(serverList),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") {
      return;
    }
    for (const key of ["DATABASE_URL", "APP_PASSWORD_HASH", "SESSION_SECRET"] as const) {
      if (!env[key]) {
        context.addIssue({ code: "custom", path: [key], message: "Required in production" });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (source: NodeJS.ProcessEnv): Env => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};
