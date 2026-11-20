import { useEffect, useRef } from "react";
import type { ClientGameSocket } from "@/network";

/**
 * Tells the server when the NPC window closes, however it closed, so the NPC stops talking to the
 * hero and stops turning to face them.
 */
export function useLeaveNpc(socket: ClientGameSocket, isOpen: boolean) {
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (wasOpen.current && !isOpen) socket.emit("leaveNpc", undefined);
    wasOpen.current = isOpen;
  }, [socket, isOpen]);
}
