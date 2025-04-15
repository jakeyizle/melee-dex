import path, { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
export const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const INDEX_HTML = path.join(RENDERER_DIST, "index.html");
export const WORKER_URL = `${VITE_DEV_SERVER_URL}/workerRenderer.html`;
export const WORKER_HTML = path.join(RENDERER_DIST, "workerRenderer.html");
export const PRELOAD = path.join(__dirname, "../preload/index.mjs");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;
