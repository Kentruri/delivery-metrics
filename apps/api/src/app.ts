import { timingSafeEqual } from "node:crypto";
import {
  deploysCsvPath,
  errorResponseSchema,
  exportQuerySchema,
  healthEndpoint,
  historyEndpoint,
  historyQuerySchema,
  loginBodySchema,
  loginEndpoint,
  logoutEndpoint,
  type SyncReport,
  sessionEndpoint,
  sessionResponseSchema,
  summaryCsvPath,
  syncEndpoint,
  WINDOW_HOURS,
} from "@cloudnonic/delivery-contracts";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { verifyPassword } from "./auth/password.js";
import {
  createRateLimiter,
  createSessionToken,
  isValidSession,
  readCookie,
  SESSION_COOKIE,
  sessionCookie,
} from "./auth/session.js";
import { TENSORPARC_REPOS } from "./config/repos.js";
import type { Store } from "./db/store.js";
import type { Env } from "./env.js";
import { deploysCsv, summaryCsv } from "./exports.js";

export interface AppDeps {
  env: Env;
  store: Store | null;
  sync: (() => Promise<SyncReport>) | null;
  now?: () => number;
}

const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60_000;

const sameSecret = (given: string, expected: string) => {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

// Concurrent calls share one run, so an overlapping cron does not sync twice.
const singleFlight = <T>(run: () => Promise<T>) => {
  let current: Promise<T> | null = null;
  return () => {
    current ??= run().finally(() => {
      current = null;
    });
    return current;
  };
};

export const buildApp = ({ env, store, sync, now = Date.now }: AppDeps) => {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const secure = env.NODE_ENV === "production";
  const allowLogin = createRateLimiter(LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
  const syncOnce = sync ? singleFlight(sync) : null;

  const signedIn = (request: FastifyRequest) =>
    Boolean(env.SESSION_SECRET) &&
    isValidSession(
      env.SESSION_SECRET ?? "",
      readCookie(request.headers.cookie, SESSION_COOKIE),
      now(),
    );

  const requireSession = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!signedIn(request)) {
      return reply.code(401).send({ error: "Sign in first" });
    }
    if (!store) {
      return reply.code(503).send({ error: "The database is not configured" });
    }
  };

  const guarded = { 401: errorResponseSchema, 503: errorResponseSchema };
  const today = () => new Date(now()).toISOString().slice(0, 10);

  app.route({
    method: healthEndpoint.method,
    url: healthEndpoint.path,
    schema: { response: { 200: healthEndpoint.response } },
    handler: async () => ({ status: "ok" as const }),
  });

  app.route({
    method: loginEndpoint.method,
    url: loginEndpoint.path,
    schema: {
      body: loginBodySchema,
      response: {
        200: sessionResponseSchema,
        401: errorResponseSchema,
        429: errorResponseSchema,
        503: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      if (!allowLogin(request.ip, now())) {
        return reply.code(429).send({ error: "Too many attempts; try again in 15 minutes" });
      }
      if (!env.APP_PASSWORD_HASH || !env.SESSION_SECRET) {
        return reply.code(503).send({ error: "Sign-in is not configured" });
      }
      if (!(await verifyPassword(request.body.password, env.APP_PASSWORD_HASH))) {
        return reply.code(401).send({ error: "Wrong password" });
      }
      reply.header(
        "set-cookie",
        sessionCookie(createSessionToken(env.SESSION_SECRET, now()), secure),
      );
      return { authenticated: true };
    },
  });

  app.route({
    method: sessionEndpoint.method,
    url: sessionEndpoint.path,
    schema: { response: { 200: sessionResponseSchema } },
    handler: async (request) => ({ authenticated: signedIn(request) }),
  });

  app.route({
    method: logoutEndpoint.method,
    url: logoutEndpoint.path,
    schema: { response: { 200: sessionResponseSchema } },
    handler: async (_request, reply) => {
      reply.header("set-cookie", sessionCookie(null, secure));
      return { authenticated: false };
    },
  });

  app.route({
    method: historyEndpoint.method,
    url: historyEndpoint.path,
    preHandler: requireSession,
    schema: {
      querystring: historyQuerySchema,
      response: { 200: historyEndpoint.response, ...guarded },
    },
    handler: async (request) => {
      const live = store as Store;
      const [deploys, conflicts, sources] = await Promise.all([
        live.deploys(request.query.environment),
        live.conflicts(request.query.environment),
        live.sources(),
      ]);
      return {
        since: new Date(`${env.HISTORY_SINCE}T00:00:00Z`).toISOString(),
        generatedAt: new Date(now()).toISOString(),
        windowHours: WINDOW_HOURS,
        repos: TENSORPARC_REPOS.map((repo) => ({ name: repo.name, host: repo.host })),
        sources,
        deploys,
        conflicts,
      };
    },
  });

  const csv = (reply: FastifyReply, name: string, body: string) =>
    reply
      .type("text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="${name}"`)
      .send(body);

  app.route({
    method: "GET",
    url: deploysCsvPath,
    preHandler: requireSession,
    schema: { querystring: exportQuerySchema },
    handler: async (request, reply) => {
      const live = store as Store;
      const scope = request.query.environment;
      const [deploys, conflicts] = await Promise.all([live.deploys(scope), live.conflicts(scope)]);
      return csv(
        reply,
        `tensorparc-deploys-${scope}-${today()}.csv`,
        deploysCsv(deploys, conflicts, now()),
      );
    },
  });

  app.route({
    method: "GET",
    url: summaryCsvPath,
    preHandler: requireSession,
    schema: { querystring: exportQuerySchema },
    handler: async (request, reply) => {
      const scope = request.query.environment;
      const deploys = await (store as Store).deploys(scope);
      return csv(reply, `tensorparc-monthly-${scope}-${today()}.csv`, summaryCsv(deploys, now()));
    },
  });

  app.route({
    method: syncEndpoint.method,
    url: syncEndpoint.path,
    schema: { response: { 200: syncEndpoint.response, ...guarded } },
    handler: async (request, reply) => {
      const given = request.headers.authorization?.replace(/^Bearer /, "") ?? "";
      if (!env.SYNC_API_KEY || !sameSecret(given, env.SYNC_API_KEY)) {
        return reply.code(401).send({ error: "Missing or wrong sync key" });
      }
      if (!syncOnce) {
        return reply.code(503).send({ error: "Sync is not configured" });
      }
      return syncOnce();
    },
  });

  return app;
};
