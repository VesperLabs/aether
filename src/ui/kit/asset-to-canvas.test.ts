import { describe, expect, it, vi } from "vitest";
import { assetToCanvas } from "./asset-to-canvas";
import { assetToDataUrl } from "./image-tint";

vi.mock("./image-tint", () => ({ assetToDataUrl: vi.fn() }));

/** A promise this test settles by hand. */
function deferred() {
  let resolve!: (url: string) => void;
  const promise = new Promise<string>((r) => (resolve = r));
  return { promise, resolve };
}

describe("assetToCanvas", () => {
  it("drops a cancelled load that finishes after a newer one", async () => {
    const slow = deferred();
    const fast = deferred();
    vi.mocked(assetToDataUrl).mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
    const setImageData = vi.fn();

    /* A slot shows a sword, then its item changes to a shield before the sword's art loads */
    const cancel = assetToCanvas({ asset: { src: "sword.png" }, setImageData });
    cancel();
    assetToCanvas({ asset: { src: "shield.png" }, setImageData });

    fast.resolve("shield-art");
    await fast.promise;
    slow.resolve("sword-art");
    await slow.promise;
    await Promise.resolve();

    expect(setImageData.mock.calls).toEqual([["shield-art"]]);
  });
});
