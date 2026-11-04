import { useEffect } from "react";
import { Switch, Flex, Slider, Text, shakeModal } from "@/ui";
import { CONTROL_GOLD } from "@/ui/kit/modal-gilding";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { isMobile } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { TextDivider } from "@/ui";
import { canUseVideoChat } from "@/client/hud/video/video-support";
import { useAudioToggle, useVolumeSetting } from "./use-audio-settings";
import { usePersistSetting } from "./use-persist-setting";

/* Off reads as zero, and raising the slider turns the sound back on. */
const VolumeRow = ({
  label,
  volume,
  toggle,
  isOn,
}: {
  label: string;
  volume: "musicVolume" | "sfxVolume";
  toggle: "playMusic" | "playSfx";
  isOn: boolean;
}) => {
  const [value, changeVolume] = useVolumeSetting(volume);
  const setIsOn = useAudioToggle(toggle);
  return (
    <Flex sx={{ alignItems: "center", gap: 3, px: 2, py: 1, borderRadius: 2, bg: "shadow.10" }}>
      <Text sx={{ flex: 1, lineHeight: 1 }}>{label}</Text>
      <Flex sx={{ flex: 1, alignItems: "center" }}>
        <Slider
          label={label}
          value={isOn ? value : 0}
          color={CONTROL_GOLD}
          thumbSize={12}
          onChange={(next) => {
            changeVolume(next);
            if (next > 0 && !isOn) setIsOn(true);
          }}
        />
      </Flex>
    </Flex>
  );
};

/**
 * Shown from the in-game settings modal only. `heroInit` loads values from the server;
 * toggles emit `updateUserSetting` for persistence (`users.userSettings.*`).
 */
export const UserSettingsForm = () => {
  const { userSettings, setUserSettings, socket, isLoggedIn } = useAppContext();
  const { showMinimap, playMusic, playSfx, videoChat, charLevels, screenShake } =
    userSettings ?? {};
  const videoChatAllowed = canUseVideoChat();

  const persistSetting = usePersistSetting();

  useEffect(() => {
    if (!videoChatAllowed && videoChat) {
      setUserSettings((prev) => ({
        ...DEFAULT_USER_SETTINGS,
        ...(prev ?? {}),
        videoChat: false,
      }));
      if (isLoggedIn) {
        socket.emit("updateUserSetting", { name: "videoChat", value: false });
      }
    }
  }, [videoChatAllowed, videoChat, isLoggedIn, socket, setUserSettings]);

  return (
    <Flex
      sx={{
        flexDirection: "column",
        maxWidth: 300,
        minWidth: 220,
        justifyContent: "end",
        gap: 2,
        fontSize: 1,
        "& label ": {
          alignItems: "center",
          lineHeight: 1,
        },
      }}
    >
      <TextDivider>Interface</TextDivider>
      {!isMobile && (
        <Switch
          spread
          label="Minimap"
          checked={!!showMinimap}
          onChange={(e) => {
            persistSetting("showMinimap", e.target.checked);
          }}
        />
      )}
      <Switch
        spread
        label="Character Levels"
        checked={!!charLevels}
        onChange={(e) => {
          persistSetting("charLevels", e.target.checked);
        }}
      />
      <Switch
        spread
        label="Screen Shake"
        checked={!!screenShake}
        onChange={(e) => {
          persistSetting("screenShake", e.target.checked);
          if (e.target.checked) shakeModal(e.target);
        }}
      />
      <TextDivider>Audio</TextDivider>
      <VolumeRow label="Music" volume="musicVolume" toggle="playMusic" isOn={!!playMusic} />
      <VolumeRow label="Sound Effects" volume="sfxVolume" toggle="playSfx" isOn={!!playSfx} />
      <TextDivider>Experimental</TextDivider>
      <Switch
        spread
        label="Video Chat"
        hint={videoChatAllowed ? undefined : "Unsupported"}
        checked={!!videoChat && videoChatAllowed}
        disabled={!videoChatAllowed}
        onChange={(e) => {
          if (!videoChatAllowed) return;
          persistSetting("videoChat", e.target.checked);
        }}
      />
    </Flex>
  );
};
