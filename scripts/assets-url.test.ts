import { describe, expect, it } from "vitest";
import { rewriteAssetUrls } from "./assets-url";

const CDN = "https://cdn.example.com/assets";

describe("rewriteAssetUrls", () => {
  it("rewrites asset paths in string and template literals", () => {
    expect(rewriteAssetUrls(`const a = "./assets/icons/axe.png";`, CDN)).toBe(
      `const a = "${CDN}/icons/axe.png";`,
    );
    expect(rewriteAssetUrls("const b = `./assets/images/${name}.png`;", CDN)).toBe(
      "const b = `" + CDN + "/images/${name}.png`;",
    );
    expect(rewriteAssetUrls(`load('./assets/audio/hit.mp3')`, CDN)).toBe(
      `load('${CDN}/audio/hit.mp3')`,
    );
  });

  it("leaves import and export specifiers alone", () => {
    const code = [
      `import { assetList } from "./assets/asset-list";`,
      `export { soundList } from './assets/sound-list';`,
      `export * from "./assets/tints";`,
      `const m = import("./assets/icon-list");`,
    ].join("\n");
    expect(rewriteAssetUrls(code, CDN)).toBe(code);
  });
});
