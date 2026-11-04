export interface UserSettings {
  playMusic: boolean;
  /** 0 to 1 slider position */
  musicVolume: number;
  playSfx: boolean;
  /** 0 to 1 slider position */
  sfxVolume: number;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
  screenShake: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  showMinimap: true,
  playMusic: true,
  musicVolume: 0.2,
  playSfx: true,
  sfxVolume: 0.5,
  videoChat: false,
  charLevels: false,
  screenShake: true,
};
