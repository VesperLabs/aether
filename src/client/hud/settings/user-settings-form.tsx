import { useEffect } from "react";
import { Switch, Flex, Text } from "@/ui";
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
      {!isMobile && (
        <Switch
          label={`Minimap: ${showMinimap ? "ON" : "OFF"}`}
          checked={!!showMinimap}
          onChange={(e) => {
            persistSetting("showMinimap", e.target.checked);
          }}
        />
      )}
      <Switch
        label={`Music: ${playMusic ? "ON" : "OFF"}`}
        checked={!!playMusic}
        onChange={(e) => {
          persistSetting("playMusic", e.target.checked);
        }}
      />
      <Switch
        label={`Show Character Levels: ${charLevels ? "ON" : "OFF"}`}
        checked={!!charLevels}
        onChange={(e) => {
          persistSetting("charLevels", e.target.checked);
        }}
      />
      <Switch
        label={`Screen Shake: ${screenShake ? "ON" : "OFF"}`}
        checked={!!screenShake}
        onChange={(e) => {
          persistSetting("screenShake", e.target.checked);
        }}
      />
      <TextDivider color="#d5c1a7" sx={{ textAlign: "left" }}>
        🧪 Experimental
      </TextDivider>
      <Switch
        label={`Video Chat: ${videoChat && videoChatAllowed ? "ON" : "OFF"}`}
        checked={!!videoChat && videoChatAllowed}
        disabled={!videoChatAllowed}
        onChange={(e) => {
          if (!videoChatAllowed) return;
          persistSetting("videoChat", e.target.checked);
        }}
      />
      {!videoChatAllowed && (
        <Text sx={{ fontSize: 0, color: "gray.500", lineHeight: 1.35, mt: -1 }}>
          (supported browsers only)
        </Text>
      )}
    </Flex>
  );
};
