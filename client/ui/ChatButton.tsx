import { useEffect, useState } from "react";
import { MenuButton, useAppContext } from "./";
import { Input } from "@aether/ui";
import { isMobile } from "@aether/shared";

const ChatButton = () => {
  const { tabChat, setTabChat, socket, messages, hero } = useAppContext();
  const [chatValue, setChatValue] = useState<string>("");
  const [messageIndex, setMessageIndex] = useState<number>(-1);

  useEffect(() => {
    if (!tabChat) {
      setChatValue("");
      setMessageIndex(-1);
    }
  }, [tabChat]);

  return (
    <MenuButton
      keyboardKey={tabChat ? "ENTER" : "T"}
      iconName="chat"
      sx={{
        flex: tabChat ? 1 : "unset",
        "&.active::before, &:has(.pressed)::before": { boxShadow: "none" },
      }}
      isActive={tabChat}
      disabled={tabChat} //hack to prevent double clicks
      onClick={() => setTabChat((prev) => !prev)}
    >
      {tabChat && (
        <Input
          sx={{ flex: 1 }}
          autoFocus={true}
          value={chatValue}
          onKeyDown={(e) => {
            const target = e.target as HTMLInputElement;
            const message = target?.value;

            if (e.code === "Enter") {
              if (message?.trim() !== "") {
                socket.emit("message", { message });
              }
              setTabChat(false);
            }

            if (e.code === "ArrowUp" || e.code === "ArrowDown") {
              e.preventDefault();
              const lastMessageIndex =
                messages?.filter?.((m) => m?.from === hero?.profile?.userName)?.length - 1;
              let newIndex = messageIndex;

              if (e.code === "ArrowUp") {
                if (newIndex === -1) {
                  newIndex = lastMessageIndex;
                } else {
                  newIndex = newIndex === 0 ? lastMessageIndex : newIndex - 1;
                }
              }

              if (e.code === "ArrowDown") {
                newIndex = newIndex === lastMessageIndex ? 0 : newIndex + 1;
              }

              setChatValue(messages?.[newIndex]?.message || "");
              setMessageIndex(newIndex);
            }
          }}
          onChange={(e: any) => setChatValue(e.target.value)}
          onClickOutside={() => {
            setTabChat(false);
          }}
          onBlur={(e) => {
            /* Hack to send if `Done` button is pushed */
            const message = e?.target?.value;
            if (message && isMobile) {
              if (message?.trim() !== "") socket.emit("message", { message });
            }
            setTabChat(false);
          }}
        />
      )}
    </MenuButton>
  );
};

export default ChatButton;
