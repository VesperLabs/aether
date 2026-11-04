import { useRef, useState } from "react";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { useAppContext } from "@/client/hud/app/context";
import type { SceneMain } from "@/client/scenes/main-scene";
import { usePersistSetting } from "./use-persist-setting";

const SAVE_DELAY = 400;

type AppContext = ReturnType<typeof useAppContext>;
const mainScene = (game: AppContext["game"]) =>
  game?.scene?.getScene("SceneMain") as SceneMain | undefined;

/** A volume slider's value: heard at once, saved once it settles, as a drag fires dozens of changes. */
export const useVolumeSetting = (name: "musicVolume" | "sfxVolume") => {
  const { game, userSettings } = useAppContext();
  const persistSetting = usePersistSetting();
  const [draft, setDraft] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const change = (value: number) => {
    setDraft(value);
    const scene = mainScene(game);
    if (scene) {
      scene.userSettings = { ...scene.userSettings, [name]: value };
      if (name === "musicVolume") scene.setMusicVolume(value);
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSetting(name, value);
      setDraft(null);
    }, SAVE_DELAY);
  };

  return [draft ?? userSettings?.[name] ?? DEFAULT_USER_SETTINGS[name], change] as const;
};

/** Turns music or sound effects on or off, applied right away so guests (no echo) hear it too. */
export const useAudioToggle = (name: "playMusic" | "playSfx") => {
  const { game } = useAppContext();
  const persistSetting = usePersistSetting();
  return (next: boolean) => {
    persistSetting(name, next);
    const scene = mainScene(game);
    if (!scene) return;
    scene.userSettings = { ...scene.userSettings, [name]: next };
    if (name === "playMusic") scene.toggleMusic(next);
  };
};
