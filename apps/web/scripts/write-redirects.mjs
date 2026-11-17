import { writeFileSync } from "node:fs";

const origin = process.env.API_ORIGIN;
if (!origin || !URL.canParse(origin)) {
  console.error("API_ORIGIN must be set to the API base URL before a Netlify build.");
  process.exit(1);
}

// Netlify serves /api/* from the API, so the session cookie stays first-party.
writeFileSync(
  "dist/_redirects",
  `/api/* ${origin.replace(/\/$/, "")}/:splat 200\n/* /index.html 200\n`,
);
