import type React from "react";
import type Phaser from "phaser";
import type { ChatMessage } from "@/network/messages";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import type { SceneMain } from "@/client/scenes/main-scene";
import type { Sign } from "@/client/views/sign";
import { getSpinDirection } from "@/network/session/hero/spin-direction";
import type { Cooldown, ErrorModal, HudCharacter, KeeperView } from "./context";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface WindowHandlerDeps {
  game: Phaser.Game;
  socket: ClientGameSocket;
  addMessage: (message: ChatMessage) => void;
  setKeeper: SetState<KeeperView | undefined>;
  /** The hero sprite's client-only state (dead, target, entering a door). */
  setHeroState: SetState<HudCharacter["state"] | undefined>;
  /** Whether the keeper tab is open (from the current render). */
  tabKeeper: boolean;
  setTabKeeper: SetState<boolean>;
  setSign: SetState<Sign | null>;
  setShowButtonChat: SetState<boolean>;
  setCooldowns: SetState<Record<string, Cooldown>>;
  setError: SetState<ErrorModal | null>;
  setIsLoaded: SetState<boolean>;
}

/** Handlers for what the Phaser scenes tell the HUD through window events. */
export function createWindowHandlers({
  game,
  socket,
  addMessage,
  setKeeper,
  setHeroState,
  tabKeeper,
  setTabKeeper,
  setSign,
  setShowButtonChat,
  setCooldowns,
  setError,
  setIsLoaded,
}: WindowHandlerDeps) {
  const getScene = () => game.scene.getScene("SceneMain") as SceneMain;

  const onKeeperDataUpdate = (args: {
    npcId: string;
    keeperData: KeeperView["keeperData"];
    playerQuests: HudCharacter["quests"];
  }) => {
    const scene = getScene();
    const hero = scene.hero;
    const npc = (scene.npcs.getChildren() as SceneMain["hero"][]).find(
      (n) => n?.id === args?.npcId,
    );
    if (hero?.state?.targetNpcId === args?.npcId) {
      /* The hero's quests from it are already in the client state. */
      setKeeper({ ...npc, keeperData: args?.keeperData });
      setTabKeeper(true);
    }
  };

  const onHeroChatNpc = () => {
    const scene = getScene();
    const hero = scene.hero;
    const npcId = scene?.hero?.state?.targetNpcId;
    const npcs = scene.npcs.getChildren() as SceneMain["hero"][];
    const signs = scene.signs.getChildren() as Sign[];

    const target = [...npcs, ...signs].find((n) => n?.id === npcId);

    if (!target) {
      return addMessage({ type: "error", message: "Who are you talking to?" });
    }

    if (target.kind === "keeper") {
      // Talking again closes the tab; otherwise the server opens it when it answers.
      if (!tabKeeper) socket.emit("chatNpc", { npcId: hero?.state?.targetNpcId });
      return setTabKeeper(false);
    }

    if (target.kind === "sign") {
      setSign(target as Sign);
    }

    const direction = getSpinDirection(hero, target);
    if (hero?.direction !== direction) socket.emit("changeDirection", { direction });
  };

  /* Copy the sprite's client-only state; the hero's server data comes from the client state. */
  const onUpdateHud = () => {
    const state = getScene().hero?.state;
    setHeroState(state ? { ...(state as object) } : undefined);
  };

  const onNearNpc = (e: WindowEventMap["HERO_NEAR_NPC"]) => {
    setShowButtonChat(!!e?.detail);
    if (!e?.detail) {
      setTabKeeper(false);
      setSign(null);
    }
  };

  const onStartCooldown = (e: WindowEventMap["HERO_START_COOLDOWN"]) => {
    const { spellName, duration, startTime, sharedDuration } = e.detail;
    setCooldowns((prev) => {
      // spellName !== 'attack', 'potion' update the shared base cooldown
      if (sharedDuration) {
        prev["global"] = { duration: sharedDuration, startTime };
      }
      return { ...prev, [spellName]: { duration, startTime } };
    });
  };

  const onLoadError = () => {
    setError({
      title: "Error",
      description:
        "There was a problem loading some assets.  This is probably because I'm in the process of deploying a new version.  Refresh and come back later if stuff isn't loading.",
    });
  };

  const onGameLoaded = () => {
    setIsLoaded(true);
  };

  return {
    onKeeperDataUpdate,
    onHeroChatNpc,
    onUpdateHud,
    onNearNpc,
    onStartCooldown,
    onLoadError,
    onGameLoaded,
  };
}
