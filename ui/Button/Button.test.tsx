import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Button from "./Button";
import "@testing-library/jest-dom";

describe("Button", () => {
  beforeEach(() => {
    render(<Button>Content</Button>);
  });

  test("renders a button with provided content", () => {
    const buttonElement = screen.getByText("Content");
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toBeInstanceOf(HTMLButtonElement);
  });

  test("applies 'active' className when clicked", () => {
    const buttonElement = screen.getByText("Content");
    fireEvent.mouseDown(buttonElement);
    expect(buttonElement).toHaveClass("active");
    fireEvent.mouseUp(buttonElement);
    expect(buttonElement).not.toHaveClass("active");
  });

  // Add more tests as needed for other functionality
});
