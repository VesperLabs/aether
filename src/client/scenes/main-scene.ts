import type { TileMap } from "@/rules/movement/tilemap";
import Phaser from "phaser";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/rules/character";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import type { Player } from "@/client/views/player";
import { isMobile } from "@/ui/kit/is-mobile";
import { netInterp } from "@/client/net/scene-interpolation";
import { applyPose } from "@/client/net/apply-pose";
import type { HeroSession } from "@/network/session/hero/hero-session";
import { bindSceneSocket } from "@/client/net/scene-socket";
import type { ClientState } from "@/network/session/client-state";
import { changeMusic } from "@/client/audio/music";
import { getPlayer, getNpc, getNpcs, getPlayers } from "./scene-entities";
import { enableDoors, initCamera } from "./main-map";
import { checkProximities } from "./proximity";
import { createMinimap, updateMinimap } from "./minimap";

/** A remote player close enough to the hero to video chat with. */
export interface NearbyPlayer {
  socketId: string;
  peerId?: string | null;
}

export class SceneMain extends Phaser.Scene {
  /** Set by `heroInit`; the entity groups below exist from then on. */
  declare hero: Player;
  declare loots: Phaser.Physics.Arcade.Group;
  declare npcs: Phaser.Physics.Arcade.Group;
  declare players: Phaser.Physics.Arcade.Group;
  declare doors: Phaser.Physics.Arcade.StaticGroup;
  declare signs: Phaser.Physics.Arcade.StaticGroup;
  declare map: Phaser.Tilemaps.Tilemap;
  /** The room's walls as plain data, for moving the hero. */
  declare tileMap?: TileMap;
  declare animatedTiles?: { init(map: Phaser.Tilemaps.Tilemap): void };
  declare roomName: string;
  declare minimap?: Phaser.Cameras.Scene2D.Camera;
  nearbyRemotePlayers: NearbyPlayer[];
  socket: ClientGameSocket;
  /** What the hero sees, built from every server message: views render entity data from it. */
  clientState: ClientState;
  userSettings: UserSettings;
  /** The hero's session: moves the hero and sends what it does. */
  heroSession: HeroSession;
  constructor(socket: ClientGameSocket, clientState: ClientState, heroSession: HeroSession) {
    super({ key: "SceneMain" });
    this.heroSession = heroSession;
    this.socket = socket;
    this.clientState = clientState;
    this.userSettings = DEFAULT_USER_SETTINGS;
    this.nearbyRemotePlayers = [];
  }

  create() {
    const scene = this;

    //create minimap
    if (!isMobile) {
      scene.minimap = createMinimap(scene);
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
    // Before the map and hero load it is still unplaced at the top-left; layoutMinimap shows it then
    return this.minimap?.setVisible(value && !!this.map && !!this.hero);
  }
  toggleCharLevels() {
    const scene = this;
    [...getPlayers(scene), ...getNpcs(scene)].forEach((a) => a.updateUserName());
  }
  update(time: number, delta: number) {
    if (!this.socket || !this?.hero?.body) return;

    /* Remote characters only: the hero is predicted locally. */
    const poses = netInterp.sample(performance.now());
    if (poses) {
      for (const [id, pose] of poses.players) {
        const player = getPlayer(this, id);
        if (player && !player.isHero) applyPose(player, pose, poses);
      }
    }

    enableDoors(this);
    updateMinimap(this);
    checkProximities(this, time);

    if (poses) {
      for (const [id, pose] of poses.npcs) {
        const npc = getNpc(this, id);
        if (npc) applyPose(npc, pose, poses);
      }
    }
  }
}
