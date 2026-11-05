import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { isOverSlot } from "./slot-state";

const renderSlot = () => {
  const { container } = render(
    <div data-tooltip-id="bag-1">
      <i />
    </div>,
  );
  return {
    slot: container.firstElementChild as Element,
    icon: container.querySelector("i") as Element,
  };
};

describe("isOverSlot", () => {
  test("counts the slot and anything inside it", () => {
    const { slot, icon } = renderSlot();
    expect(isOverSlot(slot, "bag-1")).toBe(true);
    expect(isOverSlot(icon, "bag-1")).toBe(true);
  });

  test("is false over another slot or nothing", () => {
    expect(isOverSlot(renderSlot().icon, "bag-2")).toBe(false);
    expect(isOverSlot(null, "bag-1")).toBe(false);
  });
});
