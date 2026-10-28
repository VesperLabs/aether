import Phaser from "phaser";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/rules/world";
import type { ClientGameSocket } from "@/network";
import type { Player } from "@/client/views/player";
import { isMobile } from "@/ui/kit/is-mobile";
import { MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { decodeWireDirection } from "@/network/sync";
import { netInterp } from "@/client/net/scene-interpolation";
import { bindSceneSocket } from "@/client/net/scene-socket";
import { changeMusic } from "@/client/audio/music";
import { getPlayer, getNpc, getNpcs, getPlayers } from "./scene-entities";
import { enableDoors, initCamera } from "./main-map";
import { checkProximities } from "./proximity";

/** A remote player close enough to the hero to video chat with. */
export interface NearbyPlayer {
  socketId: string;
  peerId?: string | null;
}

export class SceneMain extends Phaser.Scene {
  /** Set by `heroInit`; the entity groups below exist from then on. */
  declare hero: Player;
  lastUpdateTime: number;
  declare loots: Phaser.Physics.Arcade.Group;
  declare npcs: Phaser.Physics.Arcade.Group;
  declare players: Phaser.Physics.Arcade.Group;
  declare doors: Phaser.Physics.Arcade.StaticGroup;
  declare signs: Phaser.Physics.Arcade.StaticGroup;
  declare map: Phaser.Tilemaps.Tilemap;
  declare animatedTiles?: { init(map: Phaser.Tilemaps.Tilemap): void };
  declare roomName: string;
  declare minimap?: Phaser.Cameras.Scene2D.Camera;
  nearbyRemotePlayers: NearbyPlayer[];
  socket: ClientGameSocket;
  userSettings: UserSettings;
  constructor(socket: ClientGameSocket) {
    super({ key: "SceneMain" });
    this.socket = socket;
    this.lastUpdateTime = 0;
    this.userSettings = DEFAULT_USER_SETTINGS;
    this.nearbyRemotePlayers = [];
  }

  create() {
    const scene = this;

    //create minimap
    if (!isMobile) {
      scene.minimap = scene.cameras.add(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);
    }

    bindSceneSocket(scene);

    const onVideoChatStreamReady = () => {
      for (const { peerId, socketId } of scene.nearbyRemotePlayers ?? []) {
        if (peerId && socketId) {
          window.dispatchEvent(
            new CustomEvent("HERO_NEAR_PLAYER", { detail: { peerId, socketId } }),
          );
        }
      }
    };
    window.addEventListener("VIDEO_CHAT_STREAM_READY", onVideoChatStreamReady);
    scene.events.once("shutdown", () => {
      window.removeEventListener("VIDEO_CHAT_STREAM_READY", onVideoChatStreamReady);
    });

    // Add event listener for window resize
    this.scale.on(
      "resize",
      () => {
        initCamera(scene, scene.hero);
      },
      this,
    );
  }
  // user setting functions
  toggleMusic(value: boolean) {
    return value ? changeMusic(this) : this.sound.stopAll();
  }
  toggleMinimap(value: boolean) {
    return this.minimap?.setVisible(value);
  }
  toggleCharLevels() {
    const scene = this;
    [...getPlayers(scene), ...getNpcs(scene)].forEach((a) => a.updateUserName());
  }
  update(time: number) {
    const elapsedTime = time - this.lastUpdateTime;
    if (!this.socket || !this?.hero?.body) return;

    const playerSnapshot = netInterp.interpolateEntityList("players");
    const npcSnapshot = netInterp.interpolateEntityList("npcs");

    /* Remote players only (hero is predicted locally). Hermite + buffered server time. */
    if (playerSnapshot) {
      for (const s of playerSnapshot?.state ?? []) {
        const player = getPlayer(this, s.socketId ?? s.id);
        if (!player || player?.state?.isDead) continue;
        if (!player.isHero) {
          if (s?.roomName != null && s.roomName !== this?.roomName) continue;
          if (player?.state?.lastTeleport >= playerSnapshot.olderTime) continue;
          if (player?.state?.lastTeleport >= playerSnapshot.newerTime) continue;
          player.setPosition(s.x, s.y);
          player.direction =
            typeof s.d === "number"
              ? decodeWireDirection(s.d, player.direction)
              : (s.direction ?? player.direction);
          player.vx = s.vx ?? 0;
          player.vy = s.vy ?? 0;
        }
      }
    }

    enableDoors(this);
    checkProximities(this, time);

    if (npcSnapshot) {
      for (const s of npcSnapshot?.state ?? []) {
        const npc = getNpc(this, s.id);
        if (!npc || npc?.state?.isDead) continue;
        if (s?.roomName != null && s.roomName !== this?.roomName) continue;
        if (npc?.state?.lastTeleport >= npcSnapshot.olderTime) continue;
        if (npc?.state?.lastTeleport >= npcSnapshot.newerTime) continue;
        npc.setPosition(s.x, s.y);
        npc.direction =
          typeof s.d === "number"
            ? decodeWireDirection(s.d, npc.direction)
            : (s.direction ?? npc.direction);
        npc.vx = s.vx ?? 0;
        npc.vy = s.vy ?? 0;
      }
    }

    /* Send an update to the UI every 2 seconds.
    This is really only for the PARTY UI hud.
    Probably can check if the hero is in a party before we do this
    to save some resources */
    if (elapsedTime >= 1000 && this?.hero?.party) {
      window.dispatchEvent(
        new CustomEvent("UPDATE_ROOM_PLAYERS", {
          detail: { players: this?.players?.getChildren?.() },
        }),
      );
      this.lastUpdateTime = time;
    }
  }
}
