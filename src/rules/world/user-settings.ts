export interface UserSettings {
  playMusic: boolean;
  /** 0 to 1 slider position */
  musicVolume: number;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
  screenShake: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  showMinimap: true,
  playMusic: true,
  musicVolume: 0.3,
  videoChat: false,
  charLevels: false,
  screenShake: true,
};
