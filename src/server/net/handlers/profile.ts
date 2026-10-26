import { getFullCharacterState } from "../../utils";
import { skinTints, hairTints } from "@/shared/content";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function updateProfile(ctx: CommandContext, args: ParsedCommand<"updateProfile">) {
  const { scene, socketId, io } = ctx;
  const hairTextures = ["hair-0", "hair-1", "hair-2", "hair-3", "hair-4", "hair-5"];
  const faceTextures = ["face-1", "face-2", "face-3"];
  const whiskersTextures = ["whiskers-0", "whiskers-1", "whiskers-2", "whiskers-3"];
  const genders = ["male", "female"];
  const player = scene?.players?.[socketId];
  if (!player) return;

  const currentHairTextureIndex = hairTextures.indexOf(player?.profile?.hair?.texture);
  const currentFaceTextureIndex = faceTextures.indexOf(player?.profile?.face?.texture);
  const currentWhiskersTextureIndex = whiskersTextures.indexOf(player?.profile?.whiskers?.texture);
  const currentSkinTintIndex = skinTints.indexOf(player?.profile?.tint);
  const currentHairTintIndex = hairTints.indexOf(player?.profile?.hair?.tint);
  const currentWhiskersTintIndex = hairTints.indexOf(player?.profile?.whiskers?.tint);
  const currentGenderIndex = genders.indexOf(player?.profile?.gender);
  let nextHairTextureIndex = currentHairTextureIndex;
  let nextFaceTextureIndex = currentFaceTextureIndex;
  let nextWhiskersTextureIndex = currentWhiskersTextureIndex;
  let nextSkinTintIndex = currentSkinTintIndex;
  let nextHairTintIndex = currentSkinTintIndex;
  let nextWhiskersTintIndex = currentWhiskersTintIndex;
  let nextGenderIndex = currentGenderIndex;

  if (args?.hair?.texture === 1) {
    nextHairTextureIndex = (currentHairTextureIndex + 1) % hairTextures.length;
  } else if (args?.hair?.texture === -1) {
    nextHairTextureIndex =
      (currentHairTextureIndex - 1 + hairTextures.length) % hairTextures.length;
  }

  if (args?.face?.texture === 1) {
    nextFaceTextureIndex = (currentFaceTextureIndex + 1) % faceTextures.length;
  } else if (args?.face?.texture === -1) {
    nextFaceTextureIndex =
      (currentFaceTextureIndex - 1 + faceTextures.length) % faceTextures.length;
  }

  if (args?.whiskers?.texture === 1) {
    nextWhiskersTextureIndex = (currentWhiskersTextureIndex + 1) % whiskersTextures.length;
  } else if (args?.whiskers?.texture === -1) {
    nextWhiskersTextureIndex =
      (currentWhiskersTextureIndex - 1 + whiskersTextures.length) % whiskersTextures.length;
  }

  if (args?.skin?.tint === 1) {
    nextSkinTintIndex = (currentSkinTintIndex + 1) % skinTints.length;
  } else if (args?.skin?.tint === -1) {
    nextSkinTintIndex = (currentSkinTintIndex - 1 + skinTints.length) % skinTints.length;
  }

  if (args?.hair?.tint === 1) {
    nextHairTintIndex = (currentHairTintIndex + 1) % hairTints.length;
  } else if (args?.hair?.tint === -1) {
    nextHairTintIndex = (currentHairTintIndex - 1 + hairTints.length) % hairTints.length;
  }

  if (args?.whiskers?.tint === 1) {
    nextWhiskersTintIndex = (currentWhiskersTintIndex + 1) % hairTints.length;
  } else if (args?.whiskers?.tint === -1) {
    nextWhiskersTintIndex = (currentWhiskersTintIndex - 1 + hairTints.length) % hairTints.length;
  }

  if (args?.body === 1) {
    nextGenderIndex = (currentGenderIndex + 1) % genders.length;
  } else if (args?.body === -1) {
    nextGenderIndex = (currentGenderIndex - 1 + genders.length) % genders.length;
  }

  if (args?.userName) player.profile.userName = args?.userName?.substring?.(0, 16);
  if (args?.hair?.texture) player.profile.hair.texture = hairTextures[nextHairTextureIndex];
  if (args?.face?.texture) player.profile.face.texture = faceTextures[nextFaceTextureIndex];
  if (args?.whiskers?.texture)
    player.profile.whiskers.texture = whiskersTextures[nextWhiskersTextureIndex];
  if (args?.skin?.tint) player.profile.tint = skinTints[nextSkinTintIndex];
  if (args?.hair?.tint) player.profile.hair.tint = hairTints[nextHairTintIndex];
  if (args?.whiskers?.tint) player.profile.whiskers.tint = hairTints[nextWhiskersTintIndex];
  if (args?.body) player.profile.gender = genders[nextGenderIndex];

  /* Save the user's data */
  scene.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
}
