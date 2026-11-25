// Applied in order, once each; never edit a migration that has shipped, add a new one.
export const MIGRATIONS = [
  {
    name: "001_init",
    sql: `
      create table host_deploys (
        id text primary key,
        repo text not null,
        source text not null,
        environment text not null,
        sha text,
        status text not null,
        finished_at timestamptz not null,
        author text,
        message text not null default '',
        seen_at timestamptz not null default now()
      );
      create index host_deploys_repo on host_deploys (repo, finished_at);

      create table commit_ranges (
        repo text not null,
        base text not null,
        head text not null,
        commits jsonb not null,
        primary key (repo, base, head)
      );

      create table deploys (
        id text primary key,
        repo text not null,
        environment text not null,
        finished_at timestamptz not null,
        data jsonb not null
      );
      create index deploys_environment on deploys (environment, finished_at);

      create table conflicts (
        id text primary key,
        repo text not null,
        environment text not null,
        at timestamptz not null,
        data jsonb not null
      );

      create table source_status (
        repo text not null,
        source text not null,
        data jsonb not null,
        primary key (repo, source)
      );

      create table sync_runs (
        id bigserial primary key,
        started_at timestamptz not null,
        report jsonb,
        error text
      );
    `,
  },
];
