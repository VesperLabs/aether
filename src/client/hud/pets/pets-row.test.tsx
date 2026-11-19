// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeUIProvider, type Theme } from "theme-ui";
import { emptyPetSlots } from "@/rules/capture";
import { theme } from "@/ui/kit/theme";

const emit = vi.fn();
vi.mock("@/client/hud/app/context", () => ({
  useAppContext: () => ({
    socket: { emit },
    hero: { pets: { ...emptyPetSlots(), active: { id: "a", name: "crab" } } },
  }),
}));

const { PetsRow } = await import("./pets-row");

/* jsdom has no layout, so nothing is ever under the pointer */
document.elementFromPoint = () => null;

const renderRow = () =>
  render(
    <ThemeUIProvider theme={theme as Theme}>
      <PetsRow />
    </ThemeUIProvider>,
  );

describe("pet slots", () => {
  afterEach(() => emit.mockClear());

  it("a double-click on a pet swaps it, though each press starts a drag", () => {
    const { container } = renderRow();
    const slot = container.querySelector('[data-pet-slot="active"]')!;
    fireEvent.mouseDown(slot);
    fireEvent.mouseUp(document);
    fireEvent.mouseDown(slot);
    fireEvent.mouseUp(document);
    expect(emit).toHaveBeenCalledWith("swapPet", { slot: "active" });
  });

  it("presses far apart are two single clicks", () => {
    vi.useFakeTimers({ toFake: ["performance"] });
    const { container } = renderRow();
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
