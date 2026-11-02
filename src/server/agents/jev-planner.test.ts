import { afterEach, describe, expect, it, vi } from "vitest";
import { createJevPlanner } from "./jev-planner";

afterEach(() => vi.unstubAllGlobals());

describe("createJevPlanner", () => {
  it("asks one Choice question with the situation as state and reads the answer", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        model: "jev-1.13.0",
        answers: { next: { type: "choice", choice: "hunt", confidence: 0.9 } },
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const plan = await createJevPlanner("key")("A crab is near.", "What next?", {
      hunt: "Fight the crab",
      wander: "Stroll around",
    });

    expect(plan).toEqual({ choice: "hunt", confidence: 0.9 });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "jev-latest",
      state: "A crab is near.",
      questions: {
        next: {
          type: "choice",
          instructions: "What next?",
          criteria: { hunt: "Fight the crab", wander: "Stroll around" },
        },
      },
    });
  });

  it("throws on an error answer, so the brain falls back to wandering", async () => {
    vi.stubGlobal("fetch", async () => new Response("no key", { status: 401 }));
    await expect(createJevPlanner("bad")("s", "q", { wander: "w" })).rejects.toThrow("401");
  });
});
