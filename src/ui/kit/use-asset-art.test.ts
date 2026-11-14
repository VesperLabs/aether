// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { assetToDataUrl } from "./image-tint";
import { useAssetArt } from "./use-asset-art";

vi.mock("./image-tint", () => ({ assetToDataUrl: vi.fn() }));

/** A promise this test settles by hand. */
function deferred() {
  let resolve!: (url: string) => void;
  const promise = new Promise<string>((r) => (resolve = r));
  return { promise, resolve };
}

describe("useAssetArt", () => {
  it("never shows the last item's art while the next one's loads", async () => {
    const sword = deferred();
    const katar = deferred();
    vi.mocked(assetToDataUrl).mockReturnValueOnce(sword.promise).mockReturnValueOnce(katar.promise);

    const { result, rerender } = renderHook(({ src }) => useAssetArt({ src }), {
      initialProps: { src: "sword.png" },
    });
    await act(async () => sword.resolve("sword-art"));
    expect(result.current).toBe("sword-art");

    /* The slot's item changes: until the katar loads, it shows nothing, not the sword */
    rerender({ src: "katar.png" });
    expect(result.current).toBeUndefined();
    await act(async () => katar.resolve("katar-art"));
    expect(result.current).toBe("katar-art");
  });

  it("shows nothing once the item is gone", async () => {
    vi.mocked(assetToDataUrl).mockResolvedValueOnce("sword-art");
    const { result, rerender } = renderHook(
      ({ asset }: { asset?: { src: string } }) => useAssetArt(asset),
      { initialProps: { asset: { src: "sword.png" } as { src: string } | undefined } },
    );
    await act(async () => {});
    expect(result.current).toBe("sword-art");
    rerender({ asset: undefined });
    expect(result.current).toBeUndefined();
  });
});
