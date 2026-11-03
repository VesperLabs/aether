import { describe, expect, it, vi } from "vitest";
import { saveMapDetails, savePlayer } from "./save-player";
import type { Database } from "./database";
import type { Logger } from "@/server/log/logger";

describe("saving players", () => {
  it("logs a failed save instead of throwing", async () => {
    const error = vi.fn();
    const world = {
      db: {
        updateUser: vi.fn().mockRejectedValue(new Error("down")),
        updateUserMapDetails: vi.fn().mockRejectedValue(new Error("down")),
      } as unknown as Database,
      log: { error } as unknown as Logger,
    };
    await savePlayer(world, {} as never);
    await saveMapDetails(world, {} as never);
    expect(error).toHaveBeenCalledTimes(2);
  });
});
