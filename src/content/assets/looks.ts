/** The hair, face and whisker textures a player can pick on the character screen, in order. */
export const hairTextures = ["hair-0", "hair-1", "hair-2", "hair-3", "hair-4", "hair-5"] as const;
/** What the profile screen calls each hairstyle. */
export const hairTextureNames: Record<(typeof hairTextures)[number], string> = {
  "hair-0": "Bald",
  "hair-1": "Swept",
  "hair-2": "Shaggy",
  "hair-3": "Long",
  "hair-4": "Bob",
  "hair-5": "Parted",
};
export const faceTextures = ["face-1", "face-2", "face-3"] as const;
export const whiskersTextures = ["whiskers-0", "whiskers-1", "whiskers-2", "whiskers-3"] as const;
/** What the profile screen calls each whiskers style; each but "None" includes brows. */
export const whiskersTextureNames: Record<(typeof whiskersTextures)[number], string> = {
  "whiskers-0": "None",
  "whiskers-1": "Full Beard",
  "whiskers-2": "Horseshoe",
  "whiskers-3": "Clean Shaven",
};
export const genders = ["male", "female"] as const;
