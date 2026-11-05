import { useEffect, useRef, useState } from "react";
import { isMobile, ItemTooltip, Text } from "@/ui";
import type { BuiltItem } from "@/content";
import { chatLinkText } from "./chat-links";

/**
 * An item linked in a chat line, with its tooltip. Hovering shows it; touch has no hover to end, as
 * a tap on the game never fires a mouse leave, so there a tap toggles it and any other press closes it.
 */
export const ChatItemLink = ({ link, tooltipId }: { link: BuiltItem; tooltipId: string }) => {
  const anchor = useRef<HTMLDivElement>(null);
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    if (!tapped) return;
    const closeOutside = (e: PointerEvent) => {
      if (!anchor.current?.contains(e.target as Node)) setTapped(false);
    };
    /* Capturing, as slots and the game stop their presses from bubbling this far */
    document.addEventListener("pointerdown", closeOutside, true);
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, [tapped]);

  return (
    <>
      <Text
        ref={anchor}
        as="span"
        data-tooltip-id={tooltipId}
        onClick={isMobile ? () => setTapped((open) => !open) : undefined}
        sx={{ color: link.rarity, cursor: "help" }}
      >
        {chatLinkText(link)}
      </Text>
      <ItemTooltip item={link} tooltipId={tooltipId} show={isMobile ? tapped : undefined} />
    </>
  );
};
