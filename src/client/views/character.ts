import Phaser from "phaser";
import type { FullCharacterWire } from "@/network/sync/character-state";
import type { ClientCharacter } from "@/network/session/client-state";
import { statsOf } from "@/network/session/character-stats";
import { filterVisibleEquipment, withCharacterModel } from "@/rules/character/character";
import type { RoomData } from "@/rules/world";
import { characterHitBox } from "@/rules/spells";

const BLANK_TEXTURE = "human-blank";

/** What a character sprite is built from: a character off the wire, flagged if it is the hero. */
export type CharacterArgs = FullCharacterWire & { isHero?: boolean };

/** Where a sprite reads its character: the client state's players or npcs. */
export type CharacterSource = ReadonlyMap<string, ClientCharacter>;

/**
 * A Phaser Container whose `CharacterData` is read-only getters over the client state, so a
 * sprite has no entity data of its own: game state written onto a sprite is a type error.
 */
class ClientCharacterData extends Phaser.GameObjects.Container {
  declare source: CharacterSource;
  declare sourceKey: string;
  /** The last record seen, for a sprite that outlives its record by a frame. */
  declare lastRecord: ClientCharacter;
  declare visibleCache?: {
    equipment: unknown;
    slots: unknown;
    value: ReturnType<typeof filterVisibleEquipment>;
  };
  /** This character's record in the client state. */
  get record(): ClientCharacter {
    const record = this.source?.get(this.sourceKey);
    if (record) this.lastRecord = record;
    return this.lastRecord;
  }
  get peerId() {
    return this.record.peerId as string;
  }
  get gold() {
    return this.record.gold;
  }
  get profile() {
    return this.record.profile as any;
  }
  get equipment() {
    return (this.record.equipment ?? {}) as Record<string, any>;
  }
  get visibleEquipment() {
    const { equipment, activeItemSlots } = this.record;
    const cache = this.visibleCache;
    if (cache && cache.equipment === equipment && cache.slots === activeItemSlots)
      return cache.value;
    const value = filterVisibleEquipment(
      this.record as Parameters<typeof filterVisibleEquipment>[0],
    );
    this.visibleCache = { equipment, slots: activeItemSlots, value };
    return value;
  }
  get inventory() {
    return this.record.inventory as any;
  }
  get baseStats() {
    return (this.record as { baseStats?: any }).baseStats;
  }
  /** Read-only: stats with the latest vitals. Hp bars and the HUD read these; nothing writes them. */
  get stats() {
    return statsOf(this.record) as any;
  }
  get npcKills() {
    return (this.record.npcKills ?? {}) as Record<string, number>;
  }
  get buffs() {
    return (this.record.buffs ?? []) as any[];
  }
  get quests() {
    return this.record.quests as any;
  }
  get abilities() {
    return (this.record.abilities ?? {}) as Record<string, any>;
  }
  get activeItemSlots() {
    return (this.record.activeItemSlots ?? []) as string[];
  }
}

/**
 * The Phaser side of a character, used by the client. The data and rules are in the shared
 * character model; this adds the physics body and the hit box sprite.
 */
export class Character extends withCharacterModel(ClientCharacterData) {
  declare hitBox: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  /** The client only builds characters that are in the room it shows. */
  declare roomName: string;
  declare room: RoomData;
  constructor(scene: Phaser.Scene, args: CharacterArgs, source: CharacterSource) {
    super(scene, args.x, args.y, []);
    this.source = source;
    this.sourceKey = args.socketId || args.id;
    this.lastRecord = args;
    this.initCharacter(args, Date.now);
    scene.physics.add.existing(this);
    /* The server collides and hits feet with the scaled body, so match it */
    this.body.setCircle(this.bodySize, -this.bodySize, -this.bodySize);
    this.createHitBox(scene);
  }

  /** The box spells hit, the same one the server checks (relative to the character). */
  createHitBox(scene: Phaser.Scene) {
    const { bodySize, hitBoxSize, hitBoxInset } = this;
    const box = characterHitBox({ x: 0, y: 0, bodySize, hitBoxSize, hitBoxInset });
    this.hitBox = scene.add.sprite(box.x, box.y, BLANK_TEXTURE);
    scene.physics.add.existing(this.hitBox);
    this.hitBox.displayWidth = box.halfWidth * 2;
    this.hitBox.displayHeight = box.halfHeight * 2;
    this.add(this.hitBox);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}
