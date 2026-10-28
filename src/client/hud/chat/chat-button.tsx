import { useRef, useState } from "react";
import { MenuButton } from "@/client/hud/menu/menu-button";
import { useAppContext } from "@/client/hud/app/context";
import { Input, KeyboardKey } from "@/ui";
import { isMobile } from "@/ui";

export const ChatButton = () => {
  const { tabChat, setTabChat, socket, messages, hero } = useAppContext();
  const [chatValue, setChatValue] = useState<string>("");
  const [messageIndex, setMessageIndex] = useState<number>(-1);
  /* Button fires its click on the mouseup after any press inside it, including presses in the input */
  const isPressInInput = useRef(false);

  /* Closing chat clears the draft and history position */
  if (!tabChat && (chatValue || messageIndex !== -1)) {
    setChatValue("");
    setMessageIndex(-1);
  }

  const myMessages = messages?.filter?.((m) => m?.from === hero?.profile?.userName);

  return (
    <MenuButton
      /* Enter opens chat; hide shortcut while open so Enter in the input only sends and closes.
       * Escape (menu-bar) or clicking this button again also closes it. */
      keyboardKey={tabChat ? undefined : "ENTER"}
      iconName="chat"
      sx={{
        flex: tabChat ? 1 : "unset",
        "&.active::before, &:has(.pressed)::before": { boxShadow: "none" },
      }}
      isActive={tabChat}
      onClick={() => {
        if (isPressInInput.current) {
          isPressInInput.current = false;
          return;
        }
        setTabChat((prev) => !prev);
      }}
    >
      {tabChat && (
        <Input
          sx={{ flex: 1 }}
          autoFocus={true}
          value={chatValue}
          onKeyDown={(e) => {
            const target = e.target as HTMLInputElement;
            const message = target?.value;

            if (e.code === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (message?.trim() !== "") socket.emit("message", { message });
              setTabChat(false);
            }

            if (e.code === "ArrowUp" || e.code === "ArrowDown") {
              e.preventDefault();
              const lastMessageIndex =
                myMessages?.filter?.((m) => m?.from === hero?.profile?.userName)?.length - 1;
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

              setChatValue(myMessages?.[newIndex]?.message || "");
              setMessageIndex(newIndex);
            }
          }}
          onMouseDown={() => (isPressInInput.current = true)}
          onChange={(e) => setChatValue(e.target.value)}
          onBlur={(e) => {
            /* Hack to send if `Done` button is pushed */
            const message = e?.target?.value;
            if (message && isMobile) {
              if (message?.trim() !== "") socket.emit("message", { message });
              setChatValue("");
            }
          }}
        />
      )}
      {tabChat && !isMobile && (
        /* Just a hint that Enter sends: the input handles it */
        <KeyboardKey sx={{ bottom: "-3px", right: "-3px" }} name="ENTER" showOnly />
      )}
    </MenuButton>
  );
};
