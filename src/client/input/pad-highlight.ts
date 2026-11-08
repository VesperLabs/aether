import { PAD_KEY_ATTR } from "@/ui/kit/pad-glyph";

/**
 * The controller's menu highlight: one rounded gold line round what it's on, the same line,
 * gap and corners on every control, zoomed with it.
 */

export const GOLD = "#d4b26a";
/** The highlight's line, its gap from the control, and its corners, before the HUD's zoom. */
const LINE = 2;
const GAP = 1;
const RADIUS = 6;

let highlight: HTMLElement | null = null;

/**
 * The highlight: one rounded gold box drawn over the page, sized from what it's on, so a field,
 * a toggle's row, a tab or a slot all get the same line, gap and corners, whatever their own
 * shape, and nothing beside or inside them can cover or clip it. Redrawn every frame, as
 * menus scroll.
 */
export function drawHighlight(focused: Element | null) {
  if (typeof document === "undefined") return;
  if (!highlight) {
    highlight = document.createElement("div");
    Object.assign(highlight.style, {
      pointerEvents: "none",
      boxSizing: "border-box",
      borderStyle: "solid",
      borderColor: GOLD,
    });
  }
  hideFieldBadge();
  if (!focused?.isConnected) {
    highlight.style.display = "none";
    return;
  }
  /* A control with its own key badge holds the line, drawn first so its badge sits on top */
  if (focused.querySelector(OWN_BADGE)) return drawInside(highlight, focused);
  /* Everything else: beside it, in its own container, measured as a button's line is */
  if (drawsBeside(focused)) return drawBeside(highlight, focused as HTMLElement);
  drawOver(highlight, focused);
}

/**
 * Whether the highlight goes beside the control, which needs a container to be laid out in.
 * Only one with none (a fixed element) falls back to a box over the page.
 */
const drawsBeside = (el: Element) => el instanceof HTMLElement && !!el.offsetParent;

/** Whether the line and its A badge are drawn with the control, so `PadNavBadge` stays off. */
export const drawsOwnBadge = (el: Element) => !!el.querySelector(OWN_BADGE) || drawsBeside(el);

/**
 * Next to the control, laid out from its offsets in their shared container: so it zooms and
 * rounds with the control as a line drawn inside one does.
 */
function drawBeside(box: HTMLElement, el: HTMLElement) {
  const style = getComputedStyle(el);
  /* A borderless row (a toggle's label) counts the edge a field or button has, so its line
     lines up with theirs down a column */
  const edge = (width: string) => parseFloat(width) || CONTROL_EDGE;
  const b = {
    left: edge(style.borderLeftWidth),
    right: edge(style.borderRightWidth),
    top: edge(style.borderTopWidth),
    bottom: edge(style.borderBottomWidth),
  };
  if (box.previousElementSibling !== el) el.after(box);
  if (el.matches(SLIDER)) return drawThumb(box, el as HTMLInputElement);
  if (!el.closest(NO_CORNER_BADGE)) drawFieldBadge(box, el);
  const out = GAP + LINE;
  Object.assign(box.style, {
    display: "block",
    position: "absolute",
    /* From inside its border, as a line drawn inside a button is (its padding box). From its
       outer size less its borders: an input's own inner size can leave out its padding */
    left: `${el.offsetLeft + b.left - out}px`,
    top: `${el.offsetTop + b.top - out}px`,
    right: "auto",
    bottom: "auto",
    width: `${el.offsetWidth - b.left - b.right + out * 2}px`,
    height: `${el.offsetHeight - b.top - b.bottom + out * 2}px`,
    /* Over the control and its neighbours, as the highlighted control itself is lifted */
    zIndex: "2",
    borderWidth: `${LINE}px`,
    borderRadius: `${lineRadius(el)}px`,
  });
}

const SLIDER = "input[type='range'][data-thumb-size]";

/** A ring round a slider's handle, where its value puts it, not round the whole track. */
function drawThumb(box: HTMLElement, el: HTMLInputElement) {
  const size = Number(el.dataset.thumbSize) || 0;
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const share = max > min ? (Number(el.value) - min) / (max - min) : 0;
  const out = GAP + LINE;
  Object.assign(box.style, {
    display: "block",
    position: "absolute",
    /* The handle travels the track less its own width. Snapped down to whole pixels, as the
       browser snaps the handle, or the ring sits half a pixel down and right of it */
    left: `${Math.floor(el.offsetLeft + share * (el.offsetWidth - size)) - out}px`,
    top: `${Math.floor(el.offsetTop + el.offsetHeight / 2 - size / 2) - out}px`,
    right: "auto",
    bottom: "auto",
    width: `${size + out * 2}px`,
    height: `${size + out * 2}px`,
    zIndex: "2",
    borderWidth: `${LINE}px`,
    borderRadius: "50%",
  });
}

/* A key badge a control draws on its own corner */
const OWN_BADGE = `[${PAD_KEY_ATTR}], .pad-a`;

/** Inside the control, under its key badge, in its own (already zoomed) pixels. */
function drawInside(box: HTMLElement, el: Element) {
  if (box.parentElement !== el) el.prepend(box);
  const out = GAP + LINE;
  Object.assign(box.style, {
    display: "block",
    position: "absolute",
    left: `${-out}px`,
    top: `${-out}px`,
    right: `${-out}px`,
    bottom: `${-out}px`,
    width: "auto",
    height: "auto",
    zIndex: "auto",
    borderWidth: `${LINE}px`,
    borderRadius: `${lineRadius(el)}px`,
  });
}

/**
 * The line's corners: the control's inner corner (inside its border) plus the line's reach, so
 * the two curves run parallel and its own edge can't poke through. The same rule on every
 * control, measured from the same place, so all round alike.
 */
function lineRadius(el: Element) {
  const style = getComputedStyle(el);
  const inner =
    (parseFloat(style.borderTopLeftRadius) || 0) - (parseFloat(style.borderLeftWidth) || 0);
  return Math.max(RADIUS, Math.max(0, inner) + GAP + LINE);
}

/**
 * Over the page, so nothing beside or inside the control can cover or clip it (a slot hides
 * what spills past its edge), under the menu's own A badge.
 */
function drawOver(box: HTMLElement, el: Element) {
  if (box.parentElement !== document.body) document.body.appendChild(box);
  const r = el.getBoundingClientRect();
  /* The scale it's drawn at (the HUD's zoom, or 1 in a modal), so the line matches it */
  const width = (el as HTMLElement).offsetWidth;
  const scale = width ? r.width / width : 1;
  const out = (GAP + LINE) * scale;
  Object.assign(box.style, {
    display: "block",
    position: "fixed",
    left: `${r.left - out}px`,
    top: `${r.top - out}px`,
    right: "auto",
    bottom: "auto",
    width: `${r.width + out * 2}px`,
    height: `${r.height + out * 2}px`,
    zIndex: "99999998",
    borderWidth: `${LINE * scale}px`,
    borderRadius: `${RADIUS * scale}px`,
  });
}

/** The border every field and button has (`forms.input`, `buttons.wood`). */
const CONTROL_EDGE = 1;

/** How far a key badge reaches past its control's corner (`MenuButton`, `KeyboardButton`). */
const KEY_OVERHANG = 3;

/**
 * Where a field's A badge is drawn: beside the field like its line, so it lands as a button's
 * own key badge does, rather than floating over the page. `PadNavBadge` renders into it.
 */
export const fieldBadgeHost: HTMLElement | null =
  typeof document === "undefined" ? null : document.createElement("div");

function hideFieldBadge() {
  if (fieldBadgeHost) fieldBadgeHost.style.display = "none";
}

/* Its bottom-right just past the field's corner, measured inside the border as a key badge is */
function drawFieldBadge(line: HTMLElement, el: HTMLElement) {
  const host = fieldBadgeHost;
  if (!host) return;
  if (host.previousElementSibling !== line) line.after(host);
  const style = getComputedStyle(el);
  /* Inside the border, counting a borderless row's as its line does */
  const right =
    el.offsetLeft + el.offsetWidth - (parseFloat(style.borderRightWidth) || CONTROL_EDGE);
  const bottom =
    el.offsetTop + el.offsetHeight - (parseFloat(style.borderBottomWidth) || CONTROL_EDGE);
  Object.assign(host.style, {
    display: "block",
    position: "absolute",
    left: `${right + KEY_OVERHANG}px`,
    top: `${bottom + KEY_OVERHANG}px`,
    transform: "translate(-100%, -100%)",
    pointerEvents: "none",
    /* Over the line, as a button's badge is */
    zIndex: "3",
  });
}

/* No badge on a slider's corner: left and right move it, A does nothing */
export const NO_CORNER_BADGE = "input[type='range']";
