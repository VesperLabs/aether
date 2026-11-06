import type { BuiltItem } from "@/content";
import type { NearbyPlayer } from "@/client/scenes/main-scene";
import type { Player } from "@/client/views/player";
import type { AbilitySlot } from "@/rules/spells";

export type { AbilitySlot } from "@/rules/spells";

/** Where an item was when it was clicked or dragged: "inventory", "abilities", "bag", "shop"... */
interface ItemEventDetail {
  item: BuiltItem;
  location: string;
}

interface DropItemDetail extends ItemEventDetail {
  bagId?: string;
  slotKey?: string;
  player?: unknown;
  target: Element | null;
}

/** A picked-up loot sprite as drawn on screen, for the HUD to fly into the bag. */
export interface LootFlyDetail {
  src: string;
  rect: { x: number; y: number; width: number; height: number };
  rarity?: string;
  /** A weapon's elements, so it keeps its colored outline on the way to the bag. */
  elements?: string[];
  /** Screen pixels per art pixel, so the outline is one art pixel wide. */
  pixelSize?: number;
}

interface CooldownDetail {
  spellName: string;
  duration: number;
  startTime: number;
  sharedDuration?: number;
}

/*
 * The window events the Phaser scenes and the React HUD use to talk to each other. Declaring them
 * here types `addEventListener` and `CustomEvent.detail` on both sides.
 */
declare global {
  interface WindowEventMap {
    GAME_LOADED: Event;
    LOAD_ERROR: CustomEvent<unknown>;
    UPDATE_HUD: Event;
    UPDATE_ROOM_PLAYERS: CustomEvent<{ players: Player[] }>;
    VIDEO_CHAT_STREAM_READY: Event;
    HERO_NEAR_PLAYER: CustomEvent<NearbyPlayer>;
    HERO_AWAY_PLAYER: CustomEvent<NearbyPlayer>;
    HERO_NEAR_NPC: CustomEvent<string | null | undefined>;
    HERO_DEAD: Event;
    HERO_RESPAWN: Event;
    HERO_START_COOLDOWN: CustomEvent<CooldownDetail>;
    HERO_AIM_START: CustomEvent<AbilitySlot | undefined>;
    /** The hero's timed spell stopped; `detail` is its slot if it landed. */
    HERO_CAST_ENDED: CustomEvent<AbilitySlot | null>;
    HERO_ATTACK: Event;
    /** The hero swung: 1 is the right hand, 2 the left. The HUD shows the next swing's cost. */
    HERO_ATTACK_COUNT: CustomEvent<number>;
    HERO_ATTACK_START: CustomEvent<AbilitySlot | undefined>;
    /** Dodge button pressed (shows the aimer) and released (rolls). */
    HERO_DODGE_START: Event;
    HERO_DODGE: Event;
    HERO_ABILITY: CustomEvent<AbilitySlot>;
    HERO_USE_ITEM: CustomEvent<ItemEventDetail>;
    HERO_GRAB: Event;
    HERO_CHAT_NPC: Event;
    HERO_DOUBLE_CLICK_ITEM: CustomEvent<ItemEventDetail>;
    HERO_DROP_ITEM: CustomEvent<DropItemDetail>;
    /** Cmd/Ctrl-clicked an item: open chat puts a link to it in the draft. */
    HERO_LINK_ITEM: CustomEvent<{ id: string; name: string; rarity: string }>;
    /** A dragged item is over the chat box (null once it isn't): chat previews its link. */
    HERO_CHAT_DROP_PREVIEW: CustomEvent<{ name: string; rarity: string } | null>;
    AUDIO_ITEM_CONSUME: CustomEvent<BuiltItem>;
    AUDIO_ITEM_SELL: CustomEvent<BuiltItem>;
    LOOT_FLY: CustomEvent<LootFlyDetail>;
    ITEM_DRAG: CustomEvent<{ x: number; y: number }>;
  }
}
