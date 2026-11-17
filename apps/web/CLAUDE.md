# delivery-metrics-web

Internal board for Tensorparc's delivery metrics (deploys, lead time, failed deploys). Plan and stories: https://claude.ai/artifact/Ecp8WWWwaFjsVocdpjFe3g (it still describes Go-Medicus and Sentry, which are out for now). Commands are in `README.md`.

## Rules

- All API data goes through `@cloudnonic/delivery-contracts` and is parsed with its schema (`src/api.ts`); no hand-written types that mirror a schema.
- The browser only calls relative `/api/*` paths; the API host comes from `API_ORIGIN` (dev proxy, Netlify redirects), never from the code.
- Styling uses the Tailwind tokens in `src/styles.css`; no hex colours or raw spacing in components.
- Every screen passes axe with 0 violations and works with the keyboard.
- Tests sit next to the file (`*.test.ts(x)`) and keep at least 80% line coverage.
- Every artifact is in English: code, comments, commits, PRs. Commits follow Conventional Commits.
- Ask before installing dependencies, and never commit without the user's approval.

## Design

- Visual work goes through the skills `impeccable`, `design-taste-frontend` and `emil-design-eng`. It must never read as a generic dashboard (no KPI tiles, no card grids).
- Product truth lives in `PRODUCT.md`; the visual system will live in `DESIGN.md`. The direction contract is the comment at the top of `<body>` in `index.html`.
- Cloudnonic's identity is binding: navy `#0d1a55`, Manrope (`@fontsource-variable/manrope`), the cloud mark in `src/brand/`. Icons come from `@phosphor-icons/react`, bold weight.
- The board answers in words first (the digest), and every claim links to the row that proves it. "No data" is never drawn as zero.
- The failure rule lives in `@cloudnonic/delivery-contracts` (`outcomeAt`, `FAILURE_RULE`): the board and the API's CSV use the same code and print the same words.
- Signed out, the board shows only the sign-in screen; the session is an HttpOnly cookie the API sets, and the browser never stores a token.
- Motion: color transitions at 150 ms with the `ease-out` token; movement only behind `motion-safe:`.
