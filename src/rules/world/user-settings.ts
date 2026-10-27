export interface UserSettings {
  playMusic: boolean;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  showMinimap: true,
  playMusic: true,
  videoChat: false,
  charLevels: false,
};
