import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Select } from "./select";
import "@testing-library/jest-dom/vitest";

const OPTIONS = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Bear" },
];

describe("Select", () => {
  test("opens, picks an option and closes", () => {
    const onChange = vi.fn();
    render(<Select label="Fruit" value="a" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Fruit" }));
    fireEvent.click(screen.getByRole("option", { name: "Bear" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("opens upward when there's more room above and the list won't fit below", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight - 40,
      bottom: window.innerHeight - 10,
    } as DOMRect);
    render(<Select label="Fruit" value="a" options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Fruit" }));
    expect(screen.getByRole("listbox")).toHaveStyle({ bottom: "100%" });
    vi.restoreAllMocks();
  });

  test("shows the placeholder when the value is none of the options", () => {
    render(<Select label="Fruit" value="" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Fruit" })).toHaveTextContent("None");
  });

  test("closes on a press outside", () => {
    render(<Select label="Fruit" value="a" options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Fruit" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("arrow keys step through the options and stop at the ends", () => {
    const onChange = vi.fn();
    render(<Select label="Fruit" value="a" options={OPTIONS} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Fruit" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(onChange.mock.calls).toEqual([["b"], ["a"]]);
  });
});
