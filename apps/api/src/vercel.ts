import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { loadEnv } from "./env.js";
import { startApi } from "./start.js";

// What the handler needs from the Fastify app.
type App = { ready: () => PromiseLike<unknown>; server: Pick<Server, "emit"> };

// The board calls /api/v1/...; the API routes start at /v1.
export const stripApiPrefix = (url = "/") => {
  const rest = url.replace(/^\/api(?=\/|\?|$)/, "");
  return rest.startsWith("/") ? rest : `/${rest}`;
};

// Vercel sends every /api request to this function. The app starts once per instance; if it
// cannot start (a missing variable, the database down), the request gets a 503 and the next
// request tries again.
export const createHandler = (start: () => Promise<App>) => {
  let ready: Promise<App> | null = null;
  return async (request: IncomingMessage, response: ServerResponse) => {
    ready ??= start().then(async (app) => {
      await app.ready();
      return app;
    });
    let app: App;
    try {
      app = await ready;
    } catch (error) {
      ready = null;
      console.error(error);
      response.statusCode = 503;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ message: "The API is not configured" }));
      return;
    }
    request.url = stripApiPrefix(request.url);
    app.server.emit("request", request, response);
  };
};

export default createHandler(async () => (await startApi(loadEnv(process.env))).app);
