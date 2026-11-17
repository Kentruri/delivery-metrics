import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createPostgresStore } from "../db/postgresStore.js";
import { createMemoryStore, type Store } from "../db/store.js";
import { loadEnv } from "../env.js";
import { deploysCsv, summaryCsv } from "../exports.js";
import { syncDepsFrom } from "../sync/deps.js";
import { runSync } from "../sync/run.js";

const { values } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false }, out: { type: "string" } },
});

const env = loadEnv(process.env);
let store: Store;
if (values["dry-run"]) {
  store = createMemoryStore();
} else if (env.DATABASE_URL) {
  const postgres = createPostgresStore(env.DATABASE_URL);
  await postgres.migrate();
  store = postgres;
} else {
  throw new Error("DATABASE_URL is missing; pass --dry-run to sync into memory only.");
}

const deps = syncDepsFrom(env, store);
if (!deps) {
  throw new Error("TP_GITHUB_TOKEN is missing.");
}

const report = await runSync(deps);
console.log(JSON.stringify(report, null, 2));

if (values.out) {
  await mkdir(values.out, { recursive: true });
  const now = Date.now();
  const [deploys, conflicts] = await Promise.all([store.deploys("all"), store.conflicts("all")]);
  await writeFile(join(values.out, "tensorparc-deploys.csv"), deploysCsv(deploys, conflicts, now));
  await writeFile(join(values.out, "tensorparc-monthly.csv"), summaryCsv(deploys, now));
  console.log(`CSV files written to ${values.out}`);
}

await store.close();
