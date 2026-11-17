# delivery-metrics-web

Internal board for Tensorparc's delivery metrics: every deploy, lead time, and deploys that needed a hotfix or a rollback within 72 hours. It reads the API in `apps/api` through the shared contracts in `@cloudnonic/delivery-contracts`, behind one shared password.

## Run it

```bash
pnpm install
cp .env.example .env   # API_ORIGIN for the dev proxy
pnpm dev               # http://localhost:5173, /api/* goes to API_ORIGIN
```

`@cloudnonic/delivery-contracts` comes from the workspace (`packages/contracts`): build it first with `pnpm --filter @cloudnonic/delivery-contracts build`.

## Scripts

| Script                              | Does                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server with the `/api` proxy                                        |
| `pnpm build` / `pnpm build:netlify` | Production build; the Netlify one also writes `_redirects` from `API_ORIGIN` |
| `pnpm typecheck`                    | `tsc --noEmit`                                                               |
| `pnpm test` / `pnpm test:coverage`  | Vitest + Testing Library; coverage must stay at 80% of lines                 |
| `pnpm lint` / `pnpm lint:fix`       | Biome                                                                        |

## Netlify

Set `API_ORIGIN` (and `NPM_TOKEN` once the contracts are published) in the site's environment. Every pull request gets a deploy preview.
