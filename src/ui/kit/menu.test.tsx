// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Menu } from "./menu";

describe("Menu", () => {
  it("is a panel for the controller's highlight unless told otherwise", () => {
    const { container } = render(
      <>
        <Menu id="panel" />
        <Menu id="bar" data-pad-panel={undefined} />
      </>,
    );
    expect(container.querySelector("#panel")?.hasAttribute("data-pad-panel")).toBe(true);
    expect(container.querySelector("#bar")?.hasAttribute("data-pad-panel")).toBe(false);
  });
});
