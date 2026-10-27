/**
 * In production the game loads images, audio and maps from `ASSETS_URL` (the wiki's CDN) instead of
 * the game server. Rewrites `./assets/…` string literals to that URL, but leaves module specifiers
 * alone: `src/content/assets/` is source code, and `from "./assets/asset-list"` must stay an import.
 */
const ASSET_PATH = /(\bfrom\s*|\bimport\s*\(?\s*)?(["'`])\.\/assets\//g;

export function rewriteAssetUrls(code: string, assetsUrl: string): string {
  return code.replace(ASSET_PATH, (match, importKeyword: string | undefined, quote: string) =>
    importKeyword ? match : `${quote}${assetsUrl}/`,
  );
}
