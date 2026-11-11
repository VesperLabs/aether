import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { BuiltItem } from "@/content";
import { ChatItemLink } from "./chat-item-link";

vi.mock("@/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ui")>()),
  isMobile: true,
}));

/* The tooltip tracks its size through this; jsdom doesn't have one */
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const link = { name: "Rusty Sword", base: "short-sword", rarity: "common" } as BuiltItem;
const renderLink = () => {
  const { container } = render(<ChatItemLink link={link} tooltipId="t" />);
  return container.querySelector("[data-tooltip-id='t']") as HTMLElement;
};
/* jsdom lays nothing out, so the tooltip hides as if its anchor had no size: count it anyway */
const tooltip = () => screen.queryByRole("tooltip", { hidden: true });
const opened = () => waitFor(() => expect(tooltip()).toBeInTheDocument());

describe("ChatItemLink on a touch screen", () => {
  test("a tap opens the tooltip and a press anywhere else closes it", async () => {
    const anchor = renderLink();
    fireEvent.click(anchor);
    await opened();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
  });

  test("a second tap closes it", async () => {
    const anchor = renderLink();
    fireEvent.click(anchor);
    await opened();
    fireEvent.pointerDown(anchor);
    fireEvent.click(anchor);
    await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
  });
});
