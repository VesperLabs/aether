// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { backspace, typeInto } from "./text-entry";

const field = (value: string, type = "text") => {
  const el = document.createElement("input");
  el.type = type;
  el.value = value;
  document.body.appendChild(el);
  return el;
};

describe("text entry", () => {
  it("types at the caret and tells listeners", () => {
    const el = field("ac");
    el.setSelectionRange(1, 1);
    const onInput = vi.fn();
    el.addEventListener("input", onInput);
    typeInto(el, "b");
    expect(el.value).toBe("abc");
    expect(onInput).toHaveBeenCalled();
  });

  it("deletes the character before the caret", () => {
    const el = field("abc");
    el.setSelectionRange(3, 3);
    backspace(el);
    expect(el.value).toBe("ab");
  });

  it("types at the end of an email field, which has no caret", () => {
    const el = field("me", "email");
    typeInto(el, "@");
    expect(el.value).toBe("me@");
  });

  it("stops at the field's max length", () => {
    const el = field("ab");
    el.maxLength = 2;
    typeInto(el, "c");
    expect(el.value).toBe("ab");
  });
});
