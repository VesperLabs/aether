// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyPetSlots } from "@/rules/capture";

const emit = vi.fn();
vi.mock("@/client/hud/app/context", () => ({
  useAppContext: () => ({
    socket: { emit },
    hero: { pets: { ...emptyPetSlots(), active: { id: "a", name: "crab" } } },
  }),
}));

const { PetsRow } = await import("./pets-row");

describe("pet slots", () => {
  afterEach(() => emit.mockClear());

  it("a double-click on a pet swaps it, though each press starts a drag", () => {
    const { container } = render(<PetsRow />);
    const slot = container.querySelector('[data-pet-slot="active"]')!;
    fireEvent.mouseDown(slot);
    fireEvent.mouseUp(document);
    fireEvent.mouseDown(slot);
    fireEvent.mouseUp(document);
    expect(emit).toHaveBeenCalledWith("swapPet", { slot: "active" });
  });

  it("presses far apart are two single clicks", () => {
    vi.useFakeTimers();
    const { container } = render(<PetsRow />);
    const slot = container.querySelector('[data-pet-slot="active"]')!;
    fireEvent.mouseDown(slot);
    fireEvent.mouseUp(document);
    vi.advanceTimersByTime(1000);
    fireEvent.mouseDown(slot);
    fireEvent.mouseUp(document);
    vi.useRealTimers();
    expect(emit).not.toHaveBeenCalledWith("swapPet", expect.anything());
  });
});
