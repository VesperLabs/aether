import Phaser from "phaser";
import { LIGHT_KEY, LIGHT_TEXTURE_SIZE, allLights, type Light } from "@/client/views/lights";
import type { SceneMain } from "./main-scene";

/** The part of the world the light map covers this frame. */
interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Ground lights (fires, spells, weapons) are blocked by the tree tops and roofs above them. */
const DEFAULT_BLOCKERS: readonly string[] = ["Above"];

const blockersOf = (light: Light) => light.blockedBy ?? DEFAULT_BLOCKERS;

/** The lights in view, and where each is now. */
function lightsInView({ left, top, width, height }: Area) {
  return [...allLights()].flatMap((light) => {
    const at = light.position();
    if (!at) return [];
    /* A stretched light reaches further along its length; lights near the edge still spill in */
    const spill = light.radius * (light.stretch ?? 1);
    if (at.x < left - spill || at.x > left + width + spill) return [];
    if (at.y < top - spill || at.y > top + height + spill) return [];
    return [{ light, at }];
  });
}

/** One texture per set of blocking layers, kept between frames. */
function layerTexture(scene: SceneMain, key: string, { width, height }: Area) {
  const texture = (
    scene.textures.exists(key)
      ? scene.textures.get(key)
      : scene.textures.addDynamicTexture(key, width, height)
  ) as Phaser.Textures.DynamicTexture;
  if (texture.width !== width || texture.height !== height) texture.setSize(width, height);
  return texture;
}

/**
 * Adds every light in view onto the light map. Lights are grouped by what blocks them
 * (`Light.blockedBy`): each group is added up on its own texture (black, so adding it changes
 * nothing where there is none), its blocking layers are cut out of it, and it is added onto the
 * light map. So a fire under the leaves leaves them dark, a window behind a tree leaves the tree
 * dark, and a lantern up among the roofs lights them.
 */
export function drawLights(
  scene: SceneMain,
  lightMap: Phaser.GameObjects.RenderTexture,
  area: Area,
  /** How much of each light goes into the light map (see `LIGHT_STRENGTH` in `daylight`). */
  strength: number,
) {
  const { left, top } = area;
  const groups = new Map<string, ReturnType<typeof lightsInView>>();
  for (const entry of lightsInView(area)) {
    const key = blockersOf(entry.light).join("+");
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  for (const [blockerKey, entries] of groups) {
    const key = `daylight-lights:${blockerKey}`;
    const texture = layerTexture(scene, key, area).clear().fill(0x000000);
    for (const { light, at } of entries) {
      const scale = (light.radius * 2) / LIGHT_TEXTURE_SIZE;
      texture.stamp(light.texture ?? LIGHT_KEY, undefined, at.x - left, at.y - top, {
        tint: light.texture ? 0xffffff : light.color,
        alpha: light.intensity ?? 1,
        scaleX: scale * (light.stretch ?? 1),
        scaleY: scale,
        rotation: light.angle ?? 0,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
    for (const name of blockersOf(entries[0].light)) {
      const layer = scene.map?.getLayer(name)?.tilemapLayer;
      if (layer) texture.erase(layer, layer.x - left, layer.y - top);
    }
    texture.render();
    lightMap.stamp(key, undefined, 0, 0, {
      originX: 0,
      originY: 0,
      alpha: strength,
      blendMode: Phaser.BlendModes.ADD,
    });
  }
}
