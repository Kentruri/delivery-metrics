import { buildApp } from "./app.js";
import { createPostgresStore } from "./db/postgresStore.js";
import { loadEnv } from "./env.js";
import { syncDepsFrom } from "./sync/deps.js";
import { runSync } from "./sync/run.js";

const env = loadEnv(process.env);
const store = env.DATABASE_URL ? createPostgresStore(env.DATABASE_URL) : null;
if (store) {
  await store.migrate();
}
const deps = store ? syncDepsFrom(env, store) : null;
const app = buildApp({ env, store, sync: deps ? () => runSync(deps) : null });

const shutdown = async () => {
  await app.close();
  await store?.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ host: env.HOST, port: env.PORT });
