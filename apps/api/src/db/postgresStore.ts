import {
  conflictSchema,
  deploySchema,
  environmentSchema,
  sourceStatusSchema,
} from "@cloudnonic/delivery-contracts";
import postgres from "postgres";
import { z } from "zod";
import type { HostDeploy } from "../sync/types.js";
import { MIGRATIONS } from "./migrations.js";
import type { ExportScope, Store } from "./store.js";

const CHUNK = 500;

const chunks = <T>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, index) =>
    items.slice(index * CHUNK, (index + 1) * CHUNK),
  );

const hostRow = z.object({
  id: z.string(),
  source: z.enum(["Netlify", "Forge"]),
  environment: environmentSchema,
  sha: z.string().nullable(),
  status: z.enum(["succeeded", "failed"]),
  finished_at: z.date(),
  author: z.string().nullable(),
  message: z.string(),
});

const rangeRow = z.object({
  base: z.string(),
  head: z.string(),
  commits: z.array(
    z.object({
      sha: z.string(),
      message: z.string(),
      authoredAt: z.number().nullable(),
      parents: z.number(),
    }),
  ),
});

const unwrap = (rows: readonly Record<string, unknown>[]) => rows.map((row) => row.data);

export type PostgresStore = Store & { migrate: () => Promise<string[]> };

export const createPostgresStore = (url: string): PostgresStore => {
  const sql = postgres(url, { max: 4, onnotice: () => {} });
  const scoped = (scope: ExportScope) =>
    scope === "all" ? sql`` : sql`where environment = ${scope}`;

  return {
    migrate: async () => {
      await sql`create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )`;
      const applied = new Set(
        (await sql`select name from schema_migrations`).map((row) => String(row.name)),
      );
      const ran: string[] = [];
      for (const migration of MIGRATIONS) {
        if (applied.has(migration.name)) {
          continue;
        }
        await sql.begin(async (transaction) => {
          await transaction.unsafe(migration.sql);
          await transaction.unsafe("insert into schema_migrations (name) values ($1)", [
            migration.name,
          ]);
        });
        ran.push(migration.name);
      }
      return ran;
    },

    loadHostDeploys: async (repo) => {
      const rows =
        await sql`select id, source, environment, sha, status, finished_at, author, message
        from host_deploys where repo = ${repo}`;
      return z
        .array(hostRow)
        .parse(rows)
        .map(
          (row): HostDeploy => ({
            id: row.id,
            source: row.source,
            environment: row.environment,
            sha: row.sha,
            status: row.status,
            finishedAt: row.finished_at.getTime(),
            author: row.author,
            message: row.message,
          }),
        );
    },

    saveHostDeploys: async (repo, records) => {
      for (const chunk of chunks(records)) {
        const rows = chunk.map((record) => ({
          id: record.id,
          repo,
          source: record.source,
          environment: record.environment,
          sha: record.sha,
          status: record.status,
          finished_at: new Date(record.finishedAt),
          author: record.author,
          message: record.message,
        }));
        await sql`insert into host_deploys ${sql(rows)}
          on conflict (id) do update set
            sha = excluded.sha,
            status = excluded.status,
            finished_at = excluded.finished_at,
            author = excluded.author,
            message = excluded.message,
            seen_at = now()`;
      }
    },

    loadRanges: async (repo) => {
      const rows = z
        .array(rangeRow)
        .parse(await sql`select base, head, commits from commit_ranges where repo = ${repo}`);
      return new Map(rows.map((row) => [`${row.base}...${row.head}`, row.commits]));
    },

    saveRange: async (repo, range, commits) => {
      await sql`insert into commit_ranges (repo, base, head, commits)
        values (${repo}, ${range.base}, ${range.head}, ${sql.json(commits)})
        on conflict do nothing`;
    },

    replaceRepo: async (repo, deploys, conflicts) => {
      // $2 goes in as text and Postgres parses it once: typed as jsonb, the driver would
      // JSON-encode the string again and jsonb_array_elements would get a scalar.
      await sql.begin(async (transaction) => {
        await transaction.unsafe("delete from deploys where repo = $1", [repo]);
        await transaction.unsafe("delete from conflicts where repo = $1", [repo]);
        await transaction.unsafe(
          `insert into deploys (id, repo, environment, finished_at, data)
           select item->>'id', $1, item->>'environment', (item->>'finishedAt')::timestamptz, item
           from jsonb_array_elements($2::text::jsonb) as item`,
          [repo, JSON.stringify(deploys)],
        );
        await transaction.unsafe(
          `insert into conflicts (id, repo, environment, at, data)
           select item->>'id', $1, item->>'environment', (item->>'at')::timestamptz, item
           from jsonb_array_elements($2::text::jsonb) as item`,
          [repo, JSON.stringify(conflicts)],
        );
      });
    },

    saveSourceStatus: async (status) => {
      await sql`insert into source_status (repo, source, data)
        values (${status.repo}, ${status.source}, ${sql.json(status)})
        on conflict (repo, source) do update set data = excluded.data`;
    },

    deploys: async (scope) =>
      z
        .array(deploySchema)
        .parse(unwrap(await sql`select data from deploys ${scoped(scope)} order by finished_at`)),

    conflicts: async (scope) =>
      z
        .array(conflictSchema)
        .parse(unwrap(await sql`select data from conflicts ${scoped(scope)} order by at`)),

    sources: async () =>
      z
        .array(sourceStatusSchema)
        .parse(unwrap(await sql`select data from source_status order by repo, source`)),

    recordRun: async ({ startedAt, report, error }) => {
      await sql`insert into sync_runs (started_at, report, error)
        values (${startedAt}, ${report ? sql.json(report) : null}, ${error})`;
    },

    close: () => sql.end({ timeout: 5 }),
  };
};
