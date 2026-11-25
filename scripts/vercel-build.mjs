// Packs the built board and API into Vercel's Build Output API (.vercel/output).
// Runs after `pnpm build`: the board is static and the API is one Node function at /api.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const out = ".vercel/output";
const fn = `${out}/functions/api.func`;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

await rm(out, { recursive: true, force: true });
await mkdir(fn, { recursive: true });
await cp("apps/web/dist", `${out}/static`, { recursive: true });

await build({
  entryPoints: ["apps/api/dist/vercel.js"],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // Fastify and its plugins are CommonJS; bundled into ESM they still need require.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
});

await writeFile(
  `${fn}/.vc-config.json`,
  json({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
    // The daily sync rebuilds the history from GitHub, Netlify and Forge.
    maxDuration: 300,
  }),
);

await writeFile(
  `${out}/config.json`,
  json({
    version: 3,
    routes: [
      { src: "/(.*)", headers: { "X-Robots-Tag": "noindex" }, continue: true },
      { handle: "filesystem" },
      { src: "^/api(?:/.*)?$", dest: "/api" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }),
);
