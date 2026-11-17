# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Cloudnonic staff only: the delivery manager, Tensorparc's project manager (Marcela) and the developers and tech leads who ship it. Clients do not use it. The most important moment is right after a deploy: someone wants to know, at a glance, whether that deploy hurt production (did it need a hotfix or a rollback). The same people come back to it to compare periods and to pull numbers for the monthly client email.

## Product Purpose

Delivery Metrics shows how often each repo ships, how long a change takes to reach production, and whether a deploy needed a hotfix or a rollback. It gives Tensorparc its first delivery baseline (2026 from January 1) and keeps it current with no manual entry. Success: a deploy that went wrong is visible on the board before the client reports it, and the monthly report is written from the board's numbers.

## Positioning

One place that joins the hosts' deploy records (Netlify for the frontend, Laravel Forge for the API) with GitHub's merges and releases, using rules that are written down on the board itself. Each host's own dashboard only shows its own slice, and none of them says which deploy needed a hotfix. Where GitHub and a host disagree, the board lists the disagreement instead of picking a side.

## Operating Context

- A daily sync (05:00 UTC) reads GitHub, Netlify and Forge; nothing is typed in by hand. A host without a token falls back to GitHub merges, and the board says so.
- Used after deploys, in the weekly team review and when preparing the monthly client email. Documented in Slab; work is tracked in Linear.
- Scope today: Tensorparc only (`belture-frontend` on Netlify, `belture-api` on Forge; develop, staging and production). More repos, and later other orgs, join through the API's config.
- Inferred, not confirmed: used mostly on laptops; phones must still work.

## Capabilities and Constraints

- Every deploy with date, version (tag or short SHA), who shipped it (who merged the pull request), environment and source system; deploys, release days, lead time (p50, p85) and failure rate for any date range, grouped by week, month or year, next to the period before; CSV exports of every deploy and of each month.
- The failure rule and the definitions are shown on the board, not hidden in code. A production deploy fails when, within 72 hours, it gets a hotfix (a pull request merged straight into `main`) or a rollback (a revert, or an older version deployed again). Lead time runs from a commit's author time to the first production deploy that contains it (the definition in the Tensorparc ticket); a release day is a day with at least one production deploy. Release-please version bumps and redeploys of the same commit are not counted.
- History before the board's start date is "No data", never 0; a deploy still inside its 72 hours is "watching".
- One shared password; no user accounts. UI and copy in English.
- Hosted on free plans: API on Render, web on Netlify.

## Brand Commitments

Cloudnonic's identity is binding. Its website (`cloudnonic-website-v3`) uses navy `#0d1a55` as primary and Manrope as typeface.

## Evidence on Hand

A dry run of the 2026 sync from GitHub alone (November 2026) gave the first real history: around 55 counted production deploys per repo, and four failed deploys. Netlify and Forge records join once their tokens are set, and with them the conflicts. Nothing may show invented deploy counts, lead times or failure rates.

## Product Principles

1. After a deploy, the answer comes first: did it hurt production, and why do we think so.
2. Every number carries its rule and its source; a reader can always see how it was counted.
3. Missing history is said out loud, never rendered as zero.
4. A number is only shown next to something to compare it with (the period before, the 2026 baseline).
5. Internal and honest: no vanity metrics, no decoration that a PM has to look past; where sources disagree, the board says so.

## Accessibility & Inclusion

WCAG 2.1 AA: contrast, full keyboard use, focus order, axe with zero violations; state is never carried by colour alone; reduced motion respected.
