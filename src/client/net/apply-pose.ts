import { decodeWireDirection } from "@/network/sync";
import type { Player } from "@/client/views/player";
import type { PoseFrame, PoseSample } from "./interpolation";

/** Moves a remote player or npc sprite to its blended pose. */
export function applyPose(character: Player, pose: PoseSample, frame: PoseFrame) {
  if (character.state?.isDead) return;
  /* Teleported between the two ticks: blending would slide it across the map */
  if (character.state?.lastTeleport >= frame.olderTime) return;
  character.setPosition(pose.x, pose.y);
  character.direction = decodeWireDirection(pose.d, character.direction);
  character.vx = pose.vx;
  character.vy = pose.vy;
}
