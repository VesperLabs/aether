/** Window event the HUD listens for when the hero's map changes; `detail` is the room name. */
export const ROOM_CHANGED_EVENT = "ROOM_CHANGED";

let lastRoomName = "";

/** The room the last map change loaded, for HUD that mounts after it. */
export const currentRoomName = () => lastRoomName;

export function announceRoomChange(roomName: string) {
  lastRoomName = roomName;
  window.dispatchEvent(new CustomEvent(ROOM_CHANGED_EVENT, { detail: roomName }));
}
