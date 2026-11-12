/** Pastel, so a tint multiplied over the sprite never muddies it. */
export const hairTints = [
  "0xFFFFFF",
  "0xFFD6D6",
  "0xFFC8B4",
  "0xFFE4C4",
  "0xFFF5BA",
  "0xF0FFC2",
  "0xD4F5C4",
  "0xC2F0E0",
  "0xC4F0F5",
  "0xC8E0FF",
  "0xD0D4FF",
  "0xE0CCFF",
  "0xF0CCFF",
  "0xFFCCF0",
  "0xFFC4DC",
  "0xE8E0D8",
] as const satisfies readonly string[];

/** What the profile screen calls each hair and whiskers colour. */
export const hairTintNames: Record<(typeof hairTints)[number], string> = {
  "0xFFFFFF": "White",
  "0xFFD6D6": "Blush",
  "0xFFC8B4": "Peach",
  "0xFFE4C4": "Apricot",
  "0xFFF5BA": "Butter",
  "0xF0FFC2": "Lime Cream",
  "0xD4F5C4": "Mint",
  "0xC2F0E0": "Seafoam",
  "0xC4F0F5": "Aqua",
  "0xC8E0FF": "Sky",
  "0xD0D4FF": "Periwinkle",
  "0xE0CCFF": "Lavender",
  "0xF0CCFF": "Lilac",
  "0xFFCCF0": "Bubblegum",
  "0xFFC4DC": "Rose",
  "0xE8E0D8": "Ash",
};

/** Warm rather than grey, so even the dark tones stay rich instead of muddy. */
export const skinTints = [
  "0xFFFFFF",
  "0xFFF0E6",
  "0xFFE6D5",
  "0xF5DCC8",
  "0xEBD0BC",
  "0xE0C4B0",
  "0xC89C7C",
  "0xA87A5A",
  "0x8C5E40",
  "0x6E462E",
  "0xFFE0E6",
  "0xE6F0D0",
  "0xE0E6FF",
] as const satisfies readonly string[];
