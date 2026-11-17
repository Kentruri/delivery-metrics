# delivery-metrics

Internal API and board for Tensorparc's deploy history: the API rebuilds it from GitHub, Netlify and Forge, keeps it current with a daily sync, and serves it to the board.

- `packages/contracts`: Zod schemas, endpoint definitions and the failure rule, published as `@cloudnonic/delivery-contracts`. The web imports the same package.
- `apps/api`: Fastify server, Postgres store and the sync.
- `apps/web`: the board (React and Vite), deployed on Netlify. It has its own README.

## How the history is built

| Repo               | Deploys come from        | Environments (branches)                                       |
| ------------------ | ------------------------ | ------------------------------------------------------------- |
| `belture-frontend` | Netlify deploy list      | production (`main`), staging (`staging`), develop (`develop`) |
| `belture-api`      | Forge deployment history | production (`main`), staging (`staging`), develop (`develop`) |

- GitHub gives the pull requests merged into each branch (who merged, what), the release tags, and the commits of each production deploy (lead time).
- Every host deploy is matched to its merge by commit. Disagreements are kept and marked, never resolved silently:
  - `no_host_record`: GitHub shows a merge, but the host has no deploy of it (only inside the host's own history).
  - `no_github_record`: the host deployed a commit that no pull request merged into the branch.
  - `tag_without_deploy`: a release tag whose commit never reached production.
- Without a host token, deploys are inferred from the merges and the board says so.
- release-please version bumps reach production after the change they tag. They are kept as `release` rows but not counted; neither are redeploys of the same commit.
- A production deploy fails when, within 72 hours, it gets a hotfix (a pull request merged straight into `main`) or a rollback (a revert, or an older commit deployed again). The fix counts against the last ordinary deploy before it.
- Lead time runs from each commit's author time to the first production deploy that contains it.

## Run it

```bash
pnpm install
cp .env.example .env              # fill DATABASE_URL, the sign-in and the tokens
docker compose up -d db           # local Postgres
pnpm --filter @cloudnonic/delivery-contracts build
pnpm hash-password                # paste the output into APP_PASSWORD_HASH
pnpm sync                         # first backfill; migrates the database
pnpm dev                          # http://localhost:3000/v1/health
```

`pnpm sync -- --dry-run --out ./history` syncs into memory only and writes `tensorparc-deploys.csv` and `tensorparc-monthly.csv`: the 2026 history without a database.

## Endpoints

| Endpoint                                  | Access                               | Does                                                                      |
| ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `GET /v1/health`                          | open                                 | Health check                                                              |
| `POST`, `GET`, `DELETE /v1/session`       | open                                 | Sign in with the shared password (HttpOnly cookie), check, sign out       |
| `GET /v1/history?environment=`            | session                              | Deploys, conflicts and source status for one environment                  |
| `GET /v1/export/deploys.csv?environment=` | session                              | Every deploy and conflict, `all` by default                               |
| `GET /v1/export/summary.csv?environment=` | session                              | Deploys, release days, lead time (median, p85) and failure rate per month |
| `POST /v1/sync`                           | `Authorization: Bearer SYNC_API_KEY` | Runs the sync; the daily GitHub Action calls it                           |

## Add a repository

1. Add it to `apps/api/src/config/repos.ts` with its host and branches.
2. Give the host token access to it: the Netlify site ids in `TP_NETLIFY_SITES`, or the Forge sites on the servers in `TP_FORGE_ORG` and `TP_FORGE_SERVERS` (matched by repository and branch).
3. Run the sync; the board lists it on the next load.

## Scripts

| Script                             | Does                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                         | API with reload                                                                                            |
| `pnpm sync`                        | Sync into the database (`--dry-run`, `--out <dir>`)                                                        |
| `pnpm hash-password`               | Hash for `APP_PASSWORD_HASH`                                                                               |
| `pnpm build`                       | Builds the contracts and the API                                                                           |
| `pnpm typecheck`                   | `tsc --noEmit` in every package                                                                            |
| `pnpm test` / `pnpm test:coverage` | Vitest; 80% of lines. The Postgres store tests run when `TEST_DATABASE_URL` points to a throwaway database |
| `pnpm lint` / `pnpm lint:fix`      | Biome                                                                                                      |

## Repo setup on GitHub

- Secrets `API_ORIGIN` and `SYNC_API_KEY`: used by `.github/workflows/sync.yml`, every day at 05:00 UTC.
- Secret `GITLEAKS_LICENSE`: the free key for organisations from gitleaks.io, used by CI.
- Releases: release-please opens a release PR for `packages/contracts`; merging it publishes the package to GitHub Packages.
