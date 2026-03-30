import { Switch, Flex } from "@aether/ui";
import { DEFAULT_USER_SETTINGS, isMobile } from "@aether/shared";
import { useAppContext } from "./";
import TextDivider from "./TextDivider";

/**
 * Shown from the in-game settings modal only. `heroInit` loads values from the server;
 * toggles emit `updateUserSetting` for persistence (`users.userSettings.*`).
 */
const UserSettingsForm = () => {
  const { userSettings, setUserSettings, socket, isLoggedIn } = useAppContext();
  const { showMinimap, playMusic, videoChat, charLevels } = userSettings ?? {};

  const persistSetting = (name: keyof UserSettings, value: boolean) => {
    setUserSettings((prev) => ({
      ...DEFAULT_USER_SETTINGS,
      ...(prev ?? {}),
      [name]: value,
    }));
    if (isLoggedIn) {
      socket.emit("updateUserSetting", { name, value });
    }
  };

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
      <TextDivider color="#d5c1a7" sx={{ textAlign: "left" }}>
        🧪 Experimental
      </TextDivider>
      <Switch
        label={`Video Chat: ${videoChat ? "ON" : "OFF"}`}
        checked={!!videoChat}
        onChange={(e) => {
          persistSetting("videoChat", e.target.checked);
        }}
      />
    </Flex>
  );
};

export default UserSettingsForm;
