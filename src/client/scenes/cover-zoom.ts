/** The smallest whole zoom from `minZoom` up that leaves no empty space around the map. */
export function zoomToCover(
  view: { width: number; height: number },
  map: { width: number; height: number },
  minZoom: number,
) {
  return Math.max(minZoom, Math.ceil(Math.max(view.width / map.width, view.height / map.height)));
}
