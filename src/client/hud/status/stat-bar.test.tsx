import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { Bar } from "./stat-bar";

describe("Bar", () => {
  test("renders, without looping, when a party member on another map has no stats", () => {
    const missing = undefined as unknown as number;
    const { rerender } = render(<Bar min={missing} max={missing} />);
    expect(() => rerender(<Bar min={missing} max={missing} />)).not.toThrow();
  });

  test("renders when max is zero", () => {
    expect(() => render(<Bar min={0} max={0} />)).not.toThrow();
  });
});
