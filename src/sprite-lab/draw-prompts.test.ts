import { describe, expect, it } from "vitest";
import { describeFrame, fillPrompt, HUMAN_PROMPT } from "./draw-prompts";

describe("draw prompts", () => {
  it("describes frames from their place on the sheet", () => {
    expect(describeFrame({ column: 0, row: 2 })).toContain("facing the viewer, standing still");
    expect(describeFrame({ column: 2, row: 1 })).toContain("frame 2 of a 3-frame walk cycle");
    expect(describeFrame({ column: 4, row: 1 })).toContain("the right hand (the near arm)");
    expect(describeFrame({ column: 5, row: 1 })).toContain("the left hand (the far arm)");
  });

  it("fills in both slots", () => {
    const filled = fillPrompt(HUMAN_PROMPT, { column: 0, row: 2 }, "add a scarf");
    expect(filled).toContain("Change: add a scarf");
    expect(filled).not.toMatch(/\{frame\}|\{request\}/);
  });
});
