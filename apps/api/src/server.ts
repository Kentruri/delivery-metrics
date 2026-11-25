import { loadEnv } from "./env.js";
import { startApi } from "./start.js";

const env = loadEnv(process.env);
const { app, store } = await startApi(env);

const shutdown = async () => {
  await app.close();
  await store?.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ host: env.HOST, port: env.PORT });
