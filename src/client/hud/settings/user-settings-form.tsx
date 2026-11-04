import { useEffect } from "react";
import { Switch, Flex } from "@/ui";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { isMobile } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { TextDivider } from "@/ui";
import { canUseVideoChat } from "@/client/hud/video/video-support";
import { usePersistSetting } from "./use-persist-setting";

/**
 * Shown from the in-game settings modal only. `heroInit` loads values from the server;
 * toggles emit `updateUserSetting` for persistence (`users.userSettings.*`).
 */
export const UserSettingsForm = () => {
  const { userSettings, setUserSettings, socket, isLoggedIn } = useAppContext();
  const { showMinimap, playMusic, videoChat, charLevels, screenShake } = userSettings ?? {};
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
        }}
      />
      <TextDivider>Audio</TextDivider>
      <Switch
        spread
        label="Music"
        checked={!!playMusic}
        onChange={(e) => {
          persistSetting("playMusic", e.target.checked);
        }}
      />
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
