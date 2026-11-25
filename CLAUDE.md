# delivery-metrics

Internal API and board for Tensorparc's delivery metrics: deploys from GitHub, Netlify and Forge, lead time and the failure rate (hotfix or rollback within 72 hours; Sentry is not used). Plan and stories: https://claude.ai/artifact/Ecp8WWWwaFjsVocdpjFe3g. Commands and the rules of the history are in `README.md`.

## Rules

- Contract first: a change to an endpoint starts in `packages/contracts`, then the API, then the web (`apps/web`, with its own CLAUDE.md).
- Every request and response goes through its Zod schema; no hand-written types that mirror a schema (use `z.infer`).
- Configuration is read only through `apps/api/src/env.ts`; never hardcode hosts, tokens or environment values.
- Tests sit next to the file (`*.test.ts`) and keep at least 80% line coverage.
- Every artifact is in English: code, comments, commits, PRs. Commits follow Conventional Commits.
- Ask before installing dependencies, and never commit without the user's approval.
- The failure rule lives in `packages/contracts/src/rules.ts`; the API and the web read it from there.
- Sync logic stays pure (`reconcile`, `derive`) and is tested with fixtures; sources and the store sit behind interfaces.
