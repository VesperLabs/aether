import { useState } from "react";
import { createPortal } from "react-dom";
import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FramePreview } from "./frame-preview";
import "@testing-library/jest-dom/vitest";

const Tools = ({ active }: { active: boolean }) => {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>count {count}</button>
      {active && createPortal(<div>toolbar</div>, document.body)}
    </>
  );
};

/* The kit's button presses on mouse down and up, not on click. */
const press = (name: string) => {
  fireEvent.mouseDown(screen.getByRole("button", { name }));
  fireEvent.mouseUp(document);
};

const renderPreview = () =>
  render(
    <FramePreview cell={8} paint={() => {}} label="Preview">
      {(expanded) => <Tools active={expanded} />}
    </FramePreview>,
  );

describe("FramePreview", () => {
  test("shows the tools in the big window and keeps their state", () => {
    renderPreview();
    expect(screen.queryByText("toolbar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "count 0" }));
    press("Open big");
    expect(screen.getByText("toolbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "count 1" })).toBeInTheDocument();
  });
});
