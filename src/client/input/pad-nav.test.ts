// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PAD_DROP_EVENT, PAD_USE_EVENT } from "@/ui/item/pad-slot-events";
import { navHold, navPress, navRelease } from "./gamepad-menus";
import { PAD_ITEM_MENU_EVENT } from "./pad-item-menu-events";
import {
  activateNavFocus,
  leaveNavPopover,
  moveNavFocus,
  setMenuMode,
  syncNavFocus,
  useNavFocus,
} from "./pad-nav";

/* jsdom lays nothing out, so each element says where it is */
function place(el: Element, x: number, y: number) {
  el.getBoundingClientRect = () =>
    ({ left: x, top: y, width: 10, height: 10, right: x + 10, bottom: y + 10 }) as DOMRect;
}

/** Two slots and a button in a row, inside the HUD. */
function hud() {
  document.body.innerHTML = `
    <div id="hud-container">
      <div data-slot-key="1" data-id="sword"></div>
      <div data-slot-key="2"></div>
      <button id="loot-target">Bag</button>
    </div>`;
  const [sword, empty, bag] = document.querySelectorAll("#hud-container > *");
  place(sword, 0, 0);
  place(empty, 20, 0);
  place(bag, 40, 0);
  return { sword, empty, bag: bag as HTMLButtonElement };
}

const focusedEl = () => document.querySelector("[data-pad-focus]");

describe("pad nav", () => {
  afterEach(() => setMenuMode(false));

  it("starts on the inventory button and moves to the nearest thing that way", () => {
    const { sword, empty, bag } = hud();
    setMenuMode(true);
    syncNavFocus();
    expect(focusedEl()).toBe(bag);
    moveNavFocus("left");
    expect(focusedEl()).toBe(empty);
    moveNavFocus("left");
    expect(focusedEl()).toBe(sword);
    moveNavFocus("left");
    expect(focusedEl()).toBe(sword);
  });

  it("presses a button with A", () => {
    const { bag } = hud();
    const onClick = vi.fn();
    bag.addEventListener("click", onClick);
    setMenuMode(true);
    syncNavFocus();
    activateNavFocus();
    expect(onClick).toHaveBeenCalled();
  });

  it("picks an item up with A and puts it down on another slot", () => {
    const { sword, empty } = hud();
    const onDrop = vi.fn();
    sword.addEventListener(PAD_DROP_EVENT, (e) => onDrop((e as CustomEvent).detail));
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("left");
    moveNavFocus("left");
    activateNavFocus();
    expect(sword.hasAttribute("data-pad-held")).toBe(true);
    moveNavFocus("right");
    activateNavFocus();
    expect(onDrop).toHaveBeenCalledWith(empty);
  });

  it("uses an item with X", () => {
    const { sword } = hud();
    const onUse = vi.fn();
    sword.addEventListener(PAD_USE_EVENT, onUse);
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("left");
    moveNavFocus("left");
    useNavFocus();
    expect(onUse).toHaveBeenCalled();
  });

  it("toggles a switch through its label", () => {
    document.body.innerHTML = `
      <div data-modal="true">
        <label><input type="checkbox" /><span>Minimap</span></label>
      </div>`;
    const label = document.querySelector("label") as HTMLLabelElement;
    const box = document.querySelector("input") as HTMLInputElement;
    place(label, 0, 0);
    syncNavFocus();
    expect(focusedEl()).toBe(label);
    activateNavFocus();
    expect(box.checked).toBe(true);
  });

  it("goes down to a slider beside a row's label, and steps it with left and right", () => {
    document.body.innerHTML = `
      <div data-modal="true">
        <label><input type="checkbox" /><span>Shake</span></label>
        <div><span>Music</span><input type="range" min="0" max="100" value="50" /></div>
        <label><input type="checkbox" /><span>Video</span></label>
      </div>`;
    const [shake, video] = document.querySelectorAll("label");
    const slider = document.querySelector("input[type='range']") as HTMLInputElement;
    const rect = (x: number, y: number, w: number, h: number) =>
      ({ left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }) as DOMRect;
    shake.getBoundingClientRect = () => rect(0, 0, 200, 20);
    slider.getBoundingClientRect = () => rect(120, 40, 80, 3);
    video.getBoundingClientRect = () => rect(0, 60, 200, 20);
    const onInput = vi.fn();
    slider.addEventListener("input", onInput);
    syncNavFocus();
    moveNavFocus("down");
    expect(focusedEl()).toBe(slider);
    moveNavFocus("right");
    expect(slider.value).toBe("55");
    expect(onInput).toHaveBeenCalled();
    expect(focusedEl()).toBe(slider);
  });

  it("passes over action buttons that have their own controller buttons", () => {
    const { empty, bag } = hud();
    const dash = document.createElement("button");
    dash.setAttribute("data-pad-skip", "");
    bag.before(dash);
    place(dash, 30, 0);
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("left");
    expect(focusedEl()).toBe(empty);
  });

  it("picks up where it left off when menu mode comes back", () => {
    const { empty } = hud();
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("left");
    expect(focusedEl()).toBe(empty);
    setMenuMode(false);
    expect(focusedEl()).toBe(null);
    setMenuMode(true);
    syncNavFocus();
    expect(focusedEl()).toBe(empty);
  });

  it("keeps to its own row when there's more that way in it", () => {
    document.body.innerHTML = `
      <div data-modal="true">
        <button id="hide">Hide</button><button id="done">Done</button>
        <button id="q">q</button>
      </div>`;
    const [hide, done, q] = document.querySelectorAll("button");
    place(hide, 0, 0);
    place(done, 200, 0);
    /* A key just below and only a little right: nearer, but not in line */
    place(q, 20, 14);
    syncNavFocus();
    expect(focusedEl()).toBe(hide);
    moveNavFocus("right");
    expect(focusedEl()).toBe(done);
  });

  it("comes back to the field when the on-screen keyboard is put away", () => {
    document.body.innerHTML = `
      <div data-modal="true">
        <button role="tab">Login</button>
        <input id="email" />
      </div>`;
    const [tab, email] = document.querySelectorAll("[data-modal] > *");
    place(tab, 0, 0);
    place(email, 0, 30);
    syncNavFocus();
    moveNavFocus("down");
    expect(focusedEl()).toBe(email);
    const keyboard = document.createElement("div");
    keyboard.setAttribute("data-pad-keyboard", "");
    keyboard.innerHTML = "<button>q</button>";
    document.body.appendChild(keyboard);
    place(keyboard.firstElementChild as Element, 0, 100);
    syncNavFocus();
    expect(focusedEl()?.textContent).toBe("q");
    keyboard.remove();
    syncNavFocus();
    expect(focusedEl()).toBe(email);
  });

  it("comes back to chat's button when sending closes its box", () => {
    document.body.innerHTML = `
      <div data-pad-scope>
        <button id="bag">Bag</button>
        <button id="chat"><input id="say" /></button>
      </div>`;
    const bag = document.getElementById("bag") as Element;
    const chat = document.getElementById("chat") as Element;
    const say = document.getElementById("say") as HTMLInputElement;
    place(bag, 0, 0);
    place(chat, 40, 0);
    place(say, 40, 0);
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("right");
    expect(focusedEl()).toBe(chat);
    say.focus();
    const keyboard = document.createElement("div");
    keyboard.setAttribute("data-pad-keyboard", "");
    keyboard.innerHTML = "<button>q</button>";
    document.body.appendChild(keyboard);
    place(keyboard.firstElementChild as Element, 0, 100);
    syncNavFocus();
    say.remove();
    keyboard.remove();
    syncNavFocus();
    expect(focusedEl()).toBe(chat);
    setMenuMode(false);
  });

  it("comes back to the menu item a modal was opened from when it closes", () => {
    const { empty } = hud();
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("left");
    expect(focusedEl()).toBe(empty);
    const modal = document.createElement("div");
    modal.setAttribute("data-modal", "true");
    modal.innerHTML = "<button>Close</button>";
    document.body.appendChild(modal);
    place(modal.firstElementChild as Element, 0, 100);
    syncNavFocus();
    expect(focusedEl()?.textContent).toBe("Close");
    modal.remove();
    syncNavFocus();
    expect(focusedEl()).toBe(empty);
  });

  it("picks an item up on a tap of A, and opens its menu on a hold", () => {
    const { sword } = hud();
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("left");
    moveNavFocus("left");
    const onMenu = vi.fn();
    window.addEventListener(PAD_ITEM_MENU_EVENT, onMenu);
    navPress(
      0,
      () => {},
      () => {},
    );
    navHold(true, performance.now() + 100);
    navRelease(0);
    expect(sword.hasAttribute("data-pad-held")).toBe(true);
    expect(onMenu).not.toHaveBeenCalled();
    /* Put it back, then hold */
    activateNavFocus();
    navPress(
      0,
      () => {},
      () => {},
    );
    navHold(true, performance.now() + 1000);
    expect(onMenu).toHaveBeenCalled();
    navRelease(0);
    expect(sword.hasAttribute("data-pad-held")).toBe(false);
    window.removeEventListener(PAD_ITEM_MENU_EVENT, onMenu);
  });

  it("goes into a panel its button opens, where it last was, and backs out to the button", () => {
    document.body.innerHTML = `
      <div id="hud-container">
        <div data-pad-panel="" style="display:none">
          <div data-slot-key="1" data-id="a"></div><div data-slot-key="2" data-id="b"></div>
        </div>
        <button id="loot-target">Bag</button>
      </div>`;
    const panel = document.querySelector("[data-pad-panel]") as HTMLElement;
    const [first, second] = panel.querySelectorAll("[data-slot-key]");
    const bag = document.querySelector("button") as HTMLButtonElement;
    place(first, 0, 0);
    place(second, 20, 0);
    place(bag, 0, 40);
    /* Hidden while closed: jsdom has no layout, so it says so itself */
    const shown = (el: Element) =>
      (el.closest("[data-pad-panel]") as HTMLElement)?.style.display !== "none";
    for (const el of [first, second]) {
      const rect = el.getBoundingClientRect.bind(el);
      el.getBoundingClientRect = () => (shown(el) ? rect() : ({ width: 0, height: 0 } as DOMRect));
    }
    panel.getBoundingClientRect = () =>
      (panel.style.display === "none"
        ? { width: 0, height: 0 }
        : { width: 40, height: 10 }) as DOMRect;
    bag.addEventListener("click", () => (panel.style.display = ""));
    setMenuMode(true);
    syncNavFocus();
    expect(focusedEl()).toBe(bag);
    activateNavFocus();
    syncNavFocus();
    expect(focusedEl()).toBe(first);
    moveNavFocus("right");
    expect(focusedEl()).toBe(second);
    /* Closed (as B does): back to the button */
    panel.style.display = "none";
    syncNavFocus();
    expect(focusedEl()).toBe(bag);
    /* Opened again: where it was */
    activateNavFocus();
    syncNavFocus();
    expect(focusedEl()).toBe(second);
  });

  it("puts the highlight on chat's command list once it takes over from the keys", () => {
    document.body.innerHTML = `
      <button id="chat">
        <div data-pad-popup=""><div role="option" id="cmd">/who</div></div>
      </button>`;
    const cmd = document.getElementById("cmd") as HTMLElement;
    place(cmd, 0, 0);
    syncNavFocus();
    expect(focusedEl()).toBe(cmd);
  });

  it("goes from a quest into its tooltip's buttons and back, and onto the quest when it closes", () => {
    const { bag } = hud();
    const quest = document.createElement("div");
    quest.setAttribute("data-pad-stop", "");
    place(quest, 40, 20);
    bag.parentElement?.append(quest);
    /* A tooltip, portaled outside the HUD, opened by the highlight on its quest */
    const tooltip = document.createElement("div");
    tooltip.setAttribute("data-pad-popover", "");
    tooltip.innerHTML = `<button>Close</button><button>Accept</button>`;
    const [close, accept] = tooltip.querySelectorAll("button");
    place(tooltip, 30, 40);
    place(close, 30, 40);
    place(accept, 45, 40);
    quest.addEventListener("mouseover", () => document.body.append(tooltip));
    setMenuMode(true);
    syncNavFocus();
    moveNavFocus("down");
    expect(focusedEl()).toBe(quest);
    moveNavFocus("down");
    expect(focusedEl()).toBe(close);
    moveNavFocus("right");
    expect(focusedEl()).toBe(accept);
    expect(leaveNavPopover()).toBe(true);
    expect(focusedEl()).toBe(quest);
    activateNavFocus();
    expect(focusedEl()).toBe(close);
    tooltip.remove();
    syncNavFocus();
    expect(focusedEl()).toBe(quest);
  });
});
