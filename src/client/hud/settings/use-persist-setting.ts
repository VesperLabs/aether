import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { useAppContext } from "@/client/hud/app/context";

/** Sets a user setting locally and, when logged in, persists it (`users.userSettings.*`). */
export const usePersistSetting = () => {
  const { setUserSettings, socket, isLoggedIn } = useAppContext();
  return (name: keyof UserSettings, value: boolean) => {
    setUserSettings((prev) => ({
      ...DEFAULT_USER_SETTINGS,
      ...(prev ?? {}),
      [name]: value,
    }));
    if (isLoggedIn) {
      socket.emit("updateUserSetting", { name, value });
    }
  };
};
