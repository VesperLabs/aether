import type { Box, Circle } from "./collision";

/**
 * A wedge of a circle: what a swing has swept. It turns around (`x`, `y`) from `from` degrees
 * through `span` more, clockwise on screen (y down), out to `radius`.
 */
export interface Sector {
  x: number;
  y: number;
  radius: number;
  /** Where the wedge starts, in degrees (0 is right, 90 is down). */
  from: number;
  /** How far it turns from `from`, in degrees, 0 to 360. */
  span: number;
}

/** Points sampled along the wedge's curved edge, to catch a box it only clips there. */
const ARC_SAMPLES = 8;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Whether `degrees` falls within the wedge's angles. */
function isWithinAngles(sector: Sector, degrees: number) {
  const turned = (((degrees - sector.from) % 360) + 360) % 360;
  return turned <= sector.span;
}

function isInsideBox(box: Box, x: number, y: number) {
  return Math.abs(x - box.x) <= box.halfWidth && Math.abs(y - box.y) <= box.halfHeight;
}

/** Whether a point is inside the wedge. */
function isInsideSector(sector: Sector, x: number, y: number) {
  const dx = x - sector.x;
  const dy = y - sector.y;
  if (dx * dx + dy * dy > sector.radius * sector.radius) return false;
  if (dx === 0 && dy === 0) return true;
  return isWithinAngles(sector, (Math.atan2(dy, dx) * 180) / Math.PI);
}

/** The wedge's two straight edges, from its point out to its curve. */
function getEdges(sector: Sector) {
  return [sector.from, sector.from + sector.span].map((degrees) => ({
    x1: sector.x,
    y1: sector.y,
    x2: sector.x + Math.cos(rad(degrees)) * sector.radius,
    y2: sector.y + Math.sin(rad(degrees)) * sector.radius,
  }));
}

/** Whether a line segment crosses a box (Liang–Barsky clipping). */
function segmentHitsBox(box: Box, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let enter = 0;
  let exit = 1;
  const clips: [number, number][] = [
    [-dx, x1 - (box.x - box.halfWidth)],
    [dx, box.x + box.halfWidth - x1],
    [-dy, y1 - (box.y - box.halfHeight)],
    [dy, box.y + box.halfHeight - y1],
  ];
  for (const [p, q] of clips) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) enter = Math.max(enter, t);
    else exit = Math.min(exit, t);
    if (enter > exit) return false;
  }
  return true;
}

/** Shortest distance from a point to a line segment. */
function distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length)) : 0;
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Does a wedge overlap a box? */
export function sectorOverlapsBox(sector: Sector, box: Box): boolean {
  if (isInsideBox(box, sector.x, sector.y)) return true;
  /* The box's point nearest the wedge's point: inside it covers most cases */
  const nearestX = Math.min(Math.max(sector.x, box.x - box.halfWidth), box.x + box.halfWidth);
  const nearestY = Math.min(Math.max(sector.y, box.y - box.halfHeight), box.y + box.halfHeight);
  if (isInsideSector(sector, nearestX, nearestY)) return true;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const cornerX = box.x + sx * box.halfWidth;
      const cornerY = box.y + sy * box.halfHeight;
      if (isInsideSector(sector, cornerX, cornerY)) return true;
    }
  }
  for (const edge of getEdges(sector)) {
    if (segmentHitsBox(box, edge.x1, edge.y1, edge.x2, edge.y2)) return true;
  }
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const angle = rad(sector.from + (sector.span * i) / ARC_SAMPLES);
    const x = sector.x + Math.cos(angle) * sector.radius;
    const y = sector.y + Math.sin(angle) * sector.radius;
    if (isInsideBox(box, x, y)) return true;
  }
  return false;
}

/** Does a wedge overlap a circle? */
export function sectorOverlapsCircle(sector: Sector, circle: Circle): boolean {
  const distance = Math.hypot(circle.x - sector.x, circle.y - sector.y);
  if (distance > sector.radius + circle.radius) return false;
  if (distance <= circle.radius) return true;
  const angle = (Math.atan2(circle.y - sector.y, circle.x - sector.x) * 180) / Math.PI;
  if (isWithinAngles(sector, angle)) return true;
  return getEdges(sector).some(
    (edge) =>
      distanceToSegment(circle.x, circle.y, edge.x1, edge.y1, edge.x2, edge.y2) <= circle.radius,
  );
}
