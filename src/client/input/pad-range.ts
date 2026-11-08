/** Sliders under the controller's menu highlight: left and right step them. */

export const isRange = (el: Element): el is HTMLInputElement =>
  el.matches("input[type='range']:not(:disabled)");

/** How much one press moves a slider, as a share of its range. */
const RANGE_STEP = 0.05;

/** Moves a slider a step, telling React as a drag would (it only hears the native setter). */
export function stepRange(el: HTMLInputElement, step: 1 | -1) {
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const next = Math.min(max, Math.max(min, Number(el.value) + step * (max - min) * RANGE_STEP));
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, String(next));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
