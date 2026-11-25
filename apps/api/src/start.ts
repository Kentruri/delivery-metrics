import { buildApp } from "./app.js";
import { createPostgresStore } from "./db/postgresStore.js";
import type { Env } from "./env.js";
import { syncDepsFrom } from "./sync/deps.js";
import { runSync } from "./sync/run.js";

// The API with its store and sync, built the same way for the Node server and for Vercel.
export const startApi = async (env: Env) => {
  const store = env.DATABASE_URL ? createPostgresStore(env.DATABASE_URL) : null;
  if (store) {
    await store.migrate();
  }
  const deps = store ? syncDepsFrom(env, store) : null;
  const app = buildApp({ env, store, sync: deps ? () => runSync(deps) : null });
  return { app, store };
};
