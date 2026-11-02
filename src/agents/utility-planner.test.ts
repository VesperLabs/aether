import { describe, expect, it } from "vitest";
import { createRng } from "@/rules/world";
import { createUtilityPlanner, rollPersonality } from "./utility-planner";

const OPTIONS = { rest: "Rest", greet: "Greet", hunt: "Hunt", wander: "Wander" };

describe("createUtilityPlanner", () => {
  it("rests when resting is offered", async () => {
    const plan = await createUtilityPlanner(rollPersonality(createRng(1)), createRng(2))(
      "",
      "",
      OPTIONS,
    );
    expect(plan.choice).toBe("rest");
  });

  it("leans toward what the personality likes", async () => {
    const planner = createUtilityPlanner({ hunt: 0.9, greet: 0.1, wander: 0.3 }, createRng(3));
    const { rest: _, ...options } = OPTIONS;
    const choices = await Promise.all(
      Array.from({ length: 20 }, () => planner("", "", options).then((p) => p.choice)),
    );
    expect(choices.every((c) => c === "hunt")).toBe(true);
  });

  it("only picks offered options and repeats for the same dice", async () => {
    const run = () => createUtilityPlanner(rollPersonality(createRng(4)), createRng(5));
    const [a, b] = [run(), run()];
    for (let i = 0; i < 10; i++) {
      const options = { greet: "Greet", wander: "Wander" };
      const [pa, pb] = await Promise.all([a("", "", options), b("", "", options)]);
      expect(Object.keys(options)).toContain(pa.choice);
      expect(pa.choice).toBe(pb.choice);
    }
  });
});
