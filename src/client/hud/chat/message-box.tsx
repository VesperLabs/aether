import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Box, Flex, Text } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import type { ChatMessage, ChatMessageType } from "@/network";
import { ChatItemLink } from "./chat-item-link";
import { splitChatLinks } from "./chat-links";

type MessageProps = {
  data: ChatMessage;
  isOpen: boolean;
};

/** How close to the bottom, in pixels, still counts as reading the newest messages. */
const AT_BOTTOM_SLACK = 8;

/**
 * The chat log. Closed, each message shows for a moment and fades on its own, and the mouse passes
 * through to the game. Open, the whole history shows and scrolls, and only the lines themselves
 * catch the mouse: Phaser only sees the mouse over the canvas, so any wider box would block aiming.
 */
export const MessageBox = () => {
  const { messages, tabChat } = useAppContext();
  const scroller = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const [hasNew, setHasNew] = useState(false);

  const scrollToBottom = () => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
    isAtBottom.current = true;
    setHasNew(false);
  };

  /* Follow new messages, unless you scrolled up to read old ones while chat is open */
  useLayoutEffect(() => {
    if (!tabChat || isAtBottom.current) return scrollToBottom();
    setHasNew(true);
  }, [messages, tabChat]);

  return (
    <Flex
      sx={{
        flex: 1,
        flexDirection: "column",
        justifyContent: "flex-start",
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <Flex
        ref={scroller}
        onScroll={(e) => {
          const box = e.currentTarget;
          isAtBottom.current =
            box.scrollHeight - box.scrollTop - box.clientHeight <= AT_BOTTOM_SLACK;
          if (isAtBottom.current) setHasNew(false);
        }}
        sx={{
          m: 2,
          height: "300px",
          flexDirection: "column",
          overflowY: tabChat ? "auto" : "hidden",
          scrollbarWidth: "none",
          maskImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 25%)`,
        }}
      >
        {/* Pushes a short log to the bottom while still letting a long one scroll */}
        <Box sx={{ flex: 1 }} />
        {messages?.map((message, idx) => {
          return <Message key={idx} data={message} isOpen={tabChat} />;
        })}
      </Flex>
      {tabChat && hasNew && (
        <Box
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToBottom();
          }}
          sx={{
            position: "absolute",
            bottom: 3,
            left: "50%",
            transform: "translateX(-50%)",
            px: 2,
            py: 1,
            borderRadius: 3,
            bg: "rgba(0,0,0,.6)",
            color: "white",
            fontSize: 0,
            cursor: "pointer",
            pointerEvents: "all",
          }}
        >
          ↓ New messages
        </Box>
      )}
    </Flex>
  );
};

const getFrom = (data: ChatMessage | undefined) => {
  if (data?.type === "party") {
    return data.from ? `[Party] ${data.from}:` : "Party:";
  }
  if (data?.type === "whisper") {
    return data.to ? `To ${data.to}:` : `${data.from} whispers:`;
  }
  if (data?.type === "yell") {
    return `${data.from} yells:`;
  }
  if (data?.from) {
    return `${data?.from}:`;
  }
  return "";
};

/* Kept clear of the rarity colors, so an item in a line still stands out */
const MESSAGE_COLORS: Record<ChatMessageType, string> = {
  chat: "white",
  party: "teal.300",
  whisper: "#f58cf5",
  yell: "#ff6b4a",
  emote: "#ff9f5a",
  system: "gray.200",
  reward: "gray.200",
  error: "danger",
};

const Message: React.FC<MessageProps> = ({ data, isOpen }) => {
  const { message, type, links, timestamp } = data;
  const color = MESSAGE_COLORS[type] ?? "white";
  const isOld = useIsOld(data?.timestamp);
  const from = getFrom(data);
  return (
    <Flex sx={{ flexShrink: 0 }}>
      <Flex
        /* Keep focus in the chat input */
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        sx={{
          color,
          gap: 1,
          flexGrow: 0,
          pointerEvents: isOpen ? "all" : "none",
          opacity: isOpen || !isOld ? 1 : 0,
          transition: `opacity ${isOpen ? 0.15 : 1}s ease`,
        }}
      >
        {from ? <Text sx={{ flexShrink: 0 }}>{from}</Text> : null}
        {/* Plain text: players type these, so never render them as HTML */}
        <Text sx={{ flex: 1 }}>
          {splitChatLinks(message, links).map((part, i) => {
            if (typeof part === "string") return part;
            const tooltipId = `chat-link-${timestamp}-${i}`;
            return <ChatItemLink key={tooltipId} link={part} tooltipId={tooltipId} />;
          })}
        </Text>
      </Flex>
    </Flex>
  );
};

/* A message fades once it's older than MESSAGE_SHOW_TIME, unless chat is open */
const MESSAGE_SHOW_TIME = 6000;
const useIsOld = (timestamp?: number) => {
  const [agedTimestamp, setAgedTimestamp] = useState<number>();

  useEffect(() => {
    if (timestamp === undefined) return;
    const age = Date.now() - timestamp;
    const timeout = setTimeout(
      () => setAgedTimestamp(timestamp),
      Math.max(0, MESSAGE_SHOW_TIME - age),
    );
    return () => clearTimeout(timeout);
  }, [timestamp]);

  return timestamp !== undefined && agedTimestamp === timestamp;
};
