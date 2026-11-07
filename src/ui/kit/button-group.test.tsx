import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ButtonGroup } from "./button-group";

const OPTIONS = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
];

describe("ButtonGroup", () => {
  it("marks only the chosen option as checked", () => {
    render(<ButtonGroup label="Zoom" value={2} options={OPTIONS} onChange={() => {}} />);
    const chosen = screen.getByRole("radio", { name: "2x" });
    const other = screen.getByRole("radio", { name: "1x" });
    expect(chosen.getAttribute("aria-checked")).toBe("true");
    expect(other.getAttribute("aria-checked")).toBe("false");
  });

  it("reports the clicked option's value", () => {
    const onChange = vi.fn();
    render(<ButtonGroup label="Zoom" value={2} options={OPTIONS} onChange={onChange} />);
    const option = screen.getByRole("radio", { name: "1x" });
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
