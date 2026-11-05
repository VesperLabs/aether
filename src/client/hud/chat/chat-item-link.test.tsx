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
const tooltip = () => screen.queryByRole("tooltip");
/* Set once it has really opened: react-tooltip shows a moment after it's told to */
const opened = (anchor: HTMLElement) =>
  waitFor(() => expect(anchor).toHaveAttribute("aria-describedby", "t"));

describe("ChatItemLink on a touch screen", () => {
  test("a tap opens the tooltip and a press anywhere else closes it", async () => {
    const anchor = renderLink();
    fireEvent.click(anchor);
    await opened(anchor);
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
  });

  test("a second tap closes it", async () => {
    const anchor = renderLink();
    fireEvent.click(anchor);
    await opened(anchor);
    fireEvent.pointerDown(anchor);
    fireEvent.click(anchor);
    await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
  });
});
