import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MenuButton } from "@/client/hud/menu/menu-button";
import { useAppContext } from "@/client/hud/app/context";
import { Input, KeyboardKey } from "@/ui";
import { isMobile, Box } from "@/ui";
import { getChatCommands } from "@/network";
import { ChatCommandPopover } from "./chat-command-popover";
import { getGhostText, readChatDraft, type ChatSuggestion } from "./chat-command-match";

export const ChatButton = () => {
  const { tabChat, setTabChat, socket, messages, hero, cheats } = useAppContext();
  const [chatValue, setChatValue] = useState<string>("");
  const [highlighted, setHighlighted] = useState(0);
  /* Set by a refused Enter, so errors don't flash red while still typing */
  const [showError, setShowError] = useState(false);
  const [messageIndex, setMessageIndex] = useState<number>(-1);
  /* Button fires its click on the mouseup after any press inside it, including presses in the input */
  const isPressInInput = useRef(false);
  const inputBox = useRef<HTMLDivElement>(null);
  /* The input's real font and padding, so the ghost text lines up with what's typed */
  const [ghostFont, setGhostFont] = useState<CSSProperties>();

  /* Phaser cancels presses on the canvas, so clicking the game never blurs the input and the
   * hero ignores keys. Blur it by hand; Enter puts you back in the box while chat stays open. */
  useEffect(() => {
    if (!tabChat) return;
    const input = () => inputBox.current?.querySelector("input");
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof HTMLCanvasElement) input()?.blur();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const box = input();
      if (e.key !== "Enter" || !box || document.activeElement === box) return;
      e.preventDefault();
      box.focus();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [tabChat]);

  /* Closing chat clears the draft and history position */
  if (!tabChat && (chatValue || messageIndex !== -1)) {
    setChatValue("");
    setMessageIndex(-1);
  }

  const commands = getChatCommands(cheats);
  const draft = readChatDraft(chatValue, commands);
  const { suggestions: commandOptions, prefix } = draft;
  const showCommands = commandOptions.length > 0;
  const highlightedOption = commandOptions[Math.min(highlighted, commandOptions.length - 1)];
  const ghost =
    showError && draft.invalid ? `  ${draft.invalid}` : getGhostText(draft, highlightedOption);
  const argSpec = draft.specs[draft.argIndex];
  const hasSlashButton = commands.length > 0 && !chatValue.startsWith("/");
  useLayoutEffect(() => {
    const input = inputBox.current?.querySelector("input");
    if (!input) return;
    const style = getComputedStyle(input);
    setGhostFont({
      font: style.font,
      letterSpacing: style.letterSpacing,
      padding: style.padding,
      borderWidth: style.borderWidth,
    });
  }, [tabChat]);
  const editDraft = (value: string) => {
    setChatValue(value);
    setHighlighted(0);
    setShowError(false);
  };
  const pickCommand = (suggestion: ChatSuggestion) => editDraft(`${prefix}${suggestion.value} `);

  /* Enter: finish the word being typed, move on to the next argument, or send */
  const submit = () => {
    const picked = highlightedOption;
    const typed = draft.typed.toLowerCase();
    const isExact = (s: ChatSuggestion) =>
      s.value.replace(/^\//, "").toLowerCase() === typed ||
      s.label?.replace(/\s+/g, "").toLowerCase() === typed;
    /* An empty optional argument sends; an empty required one takes the highlighted pick */
    const pickEmpty = !typed && (draft.argIndex === -1 || (argSpec && !argSpec.optional));
    if (picked && (typed || pickEmpty) && !commandOptions.some(isExact)) {
      return pickCommand(picked);
    }
    if (draft.needsMore && draft.typed) return editDraft(`${chatValue} `);
    if (draft.error) return setShowError(true);

    const message = chatValue.trim();
    if (message === "/") return;
    if (message !== "") socket.emit("message", { message });
    setTabChat(false);
  };

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
        <Box
          as="form"
          /* A real form, so a phone keyboard's Go key submits even when it sends no key code */
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          sx={{ flex: 1, position: "relative", display: "flex" }}
        >
          {showCommands && (
            <ChatCommandPopover
              suggestions={commandOptions}
              highlighted={Math.min(highlighted, commandOptions.length - 1)}
              onPick={pickCommand}
            />
          )}
          {hasSlashButton && (
            /* Phones bury `/` on the symbols keyboard */
            <Box
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                editDraft("/");
              }}
              title="Commands"
              /* The input's own style, so it sizes and rims like the input; only hover and press
               * show it's a button */
              sx={{
                variant: "forms.input",
                px: 2,
                display: "flex",
                alignItems: "center",
                fontWeight: "bold",
                color: "text",
                cursor: "pointer",
                /* A lighter fill than the input's. The input's rim is its 30% border over its 30%
                 * fill (51% black), so clip the fill to the inside and draw that 51% rim directly */
                bg: "rgba(0,0,0,.22)",
                backgroundClip: "padding-box",
                borderColor: "rgba(0,0,0,.51)",
                borderRight: "none",
                borderRadius: "4px 0 0 4px",
                "& > span": { opacity: 0.35, transition: "opacity .15s ease" },
                "&:hover > span": { opacity: 0.7 },
                "&:active > span": { transform: "translateY(1px)" },
              }}
            >
              <span>/</span>
            </Box>
          )}
          <Box ref={inputBox} sx={{ flex: 1, position: "relative", display: "flex" }}>
            {ghost && (
              /* Same box as the input, with the draft invisible, so the ghost lines up after it */
              <Box
                aria-hidden
                style={ghostFont}
                sx={{
                  variant: "forms.input",
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  bg: "transparent",
                  borderColor: "transparent",
                  whiteSpace: "pre",
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <span style={{ visibility: "hidden" }}>{chatValue}</span>
                <Box
                  as="span"
                  sx={
                    showError && draft.invalid
                      ? { color: "danger" }
                      : { color: "text", opacity: 0.4 }
                  }
                >
                  {ghost}
                </Box>
              </Box>
            )}
            <Input
              /* Same shadow as the HUD text around it, and the ghost text */
              sx={{
                flex: 1,
                textShadow: "inherit",
                ...(hasSlashButton && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }),
              }}
              autoFocus={true}
              value={chatValue}
              enterKeyHint={draft.needsMore ? "next" : "send"}
              inputMode={argSpec?.kind === "number" ? "numeric" : "text"}
              onKeyDown={(e) => {
                const target = e.target as HTMLInputElement;
                const message = target?.value;

                if (showCommands) {
                  const last = commandOptions.length - 1;
                  const caretAtEnd = target.selectionStart === message.length;
                  if (e.code === "Tab" || (e.code === "ArrowRight" && caretAtEnd)) {
                    e.preventDefault();
                    return pickCommand(commandOptions[Math.min(highlighted, last)]);
                  }
                  if (e.code === "ArrowUp" || e.code === "ArrowDown") {
                    e.preventDefault();
                    const step = e.code === "ArrowUp" ? -1 : 1;
                    return setHighlighted(
                      (Math.min(highlighted, last) + step + last + 1) % (last + 1),
                    );
                  }
                }

                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  return submit();
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
              onKeyUp={(e) => {
                /* Esc drops the half-typed command first; chat only closes on the next one */
                if (e.key !== "Escape" || !showCommands) return;
                e.stopPropagation();
                editDraft("");
              }}
              onMouseDown={() => (isPressInInput.current = true)}
              onChange={(e) => editDraft(e.target.value)}
            />
          </Box>
          {isMobile && draft.command && (
            /* Phone number pads have no Enter */
            <Box
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                submit();
              }}
              sx={{
                px: 2,
                display: "flex",
                alignItems: "center",
                color: "white",
                cursor: "pointer",
              }}
            >
              {draft.needsMore && draft.typed ? "Next" : "Send"}
            </Box>
          )}
        </Box>
      )}
      {tabChat && !isMobile && (
        /* Just a hint that Enter sends: the input handles it */
        <KeyboardKey sx={{ bottom: "-3px", right: "-3px" }} name="ENTER" showOnly />
      )}
    </MenuButton>
  );
};
