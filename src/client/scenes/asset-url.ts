/**
 * Rewrite a `./assets/…` path to the CDN base URL when ASSETS_URL is set.
 * JSON data files contain `./assets/` paths that the Vite transform plugin cannot
 * rewrite (it only processes JS/TS modules), so we do it here at runtime.
 */
const ASSETS_BASE = process.env.ASSETS_URL || "";

export const assetUrl = (src: string) =>
  ASSETS_BASE ? src.replace(/^\.\/assets\//, ASSETS_BASE + "/") : src;
