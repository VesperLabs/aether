import type { EffectWire } from "@/network";
import type { SceneMain } from "@/client/scenes/main-scene";
import { getNpc, getPlayer } from "@/client/scenes/scene-entities";
import { Spell } from "@/client/views/spell";

/*
 * Effects (`sync/effects`) in, views out: one way in, whether the effect just started or was already
 * flying when we walked into the room.
 */

const findCharacter = (scene: SceneMain, id: string | undefined) =>
  getPlayer(scene, id) ?? getNpc(scene, id);

/** Draws an effect from where it has got to. */
export function startEffect(scene: SceneMain, effect: EffectWire) {
  switch (effect.kind) {
    case "spell": {
      const caster = findCharacter(scene, effect.casterId);
      /* Its caster left: nothing to draw it from */
      if (!caster) return;
      scene.add.existing(new Spell(scene, { ...effect, caster }));
      return;
    }
  }
}
