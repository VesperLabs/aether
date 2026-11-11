import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MenuButton } from "@/client/hud/menu/menu-button";
import { chatButtonTypes, useChatFocus } from "./use-chat-focus";
import { useAppContext } from "@/client/hud/app/context";
import { Input, KeyboardKey } from "@/ui";
import { isMobile, Box } from "@/ui";
import { getChatCommands } from "@/network";
import { ChatCommandPopover } from "./chat-command-popover";
import {
  appendChatLink,
  CHAT_DROP_ATTR,
  editChatDraft,
  snapChatCaret,
  splitChatLinks,
} from "./chat-links";
import { getGhostText, readChatDraft, type ChatSuggestion } from "./chat-command-match";

/** The most items one line can link; the server refuses more. */
const MAX_LINKS = 5;

export const ChatButton = () => {
  const { tabChat, setTabChat, socket, messages, hero, cheats } = useAppContext();
  const [chatValue, setChatValue] = useState<string>("");
  const [highlighted, setHighlighted] = useState(0);
  /* Set by a refused Enter, so errors don't flash red while still typing */
  const [showError, setShowError] = useState(false);
  /* Items linked into the draft; the server rebuilds them from their ids */
  const [links, setLinks] = useState<{ id: string; name: string; rarity: string }[]>([]);
  /* The item being dragged over the box, shown as ghost text */
  const [dropPreview, setDropPreview] = useState<{ name: string; rarity: string } | null>(null);
  /* Where the caret goes once a link's removal has rendered */
  const pendingCaret = useRef<number | null>(null);
  const lastCaret = useRef(0);
  const overlay = useRef<HTMLDivElement>(null);
  const [messageIndex, setMessageIndex] = useState<number>(-1);
  const inputBox = useRef<HTMLDivElement>(null);
  /* The input's real font and padding, so the ghost text lines up with what's typed */
  const [ghostFont, setGhostFont] = useState<CSSProperties>();

  useChatFocus(tabChat, inputBox);

  /* Cmd/Ctrl-clicking an item links it while chat is open */
  useEffect(() => {
    if (!tabChat) return;
    const onLinkItem = ({ detail }: WindowEventMap["HERO_LINK_ITEM"]) => {
      setChatValue((value) => `${appendChatLink(value, detail.name)} `);
      setLinks((current) => [...current, detail]);
      inputBox.current?.querySelector("input")?.focus();
    };
    const onDropPreview = ({ detail }: WindowEventMap["HERO_CHAT_DROP_PREVIEW"]) =>
      setDropPreview(detail);
    window.addEventListener("HERO_LINK_ITEM", onLinkItem);
    window.addEventListener("HERO_CHAT_DROP_PREVIEW", onDropPreview);
    return () => {
      window.removeEventListener("HERO_LINK_ITEM", onLinkItem);
      window.removeEventListener("HERO_CHAT_DROP_PREVIEW", onDropPreview);
      setDropPreview(null);
    };
  }, [tabChat]);

  /* Closing chat clears the draft and history position */
  if (!tabChat && (chatValue || messageIndex !== -1)) {
    setChatValue("");
    setLinks([]);
    setMessageIndex(-1);
  }

  const commands = getChatCommands(cheats);
  const draft = readChatDraft(chatValue, commands);
  const { suggestions: commandOptions, prefix } = draft;
  const showCommands = commandOptions.length > 0;
  const highlightedOption = commandOptions[Math.min(highlighted, commandOptions.length - 1)];
  const linkNames = links.map((link) => link.name);
  /* An input can't color part of its text, so with links in it the overlay draws the draft */
  const draftParts = splitChatLinks(chatValue, links);
  const hasDraftLinks = draftParts.some((part) => typeof part !== "string");
  const typedGhost =
    showError && draft.invalid ? `  ${draft.invalid}` : getGhostText(draft, highlightedOption);
  const ghost = dropPreview
    ? appendChatLink(chatValue, dropPreview.name).slice(chatValue.length)
    : typedGhost;
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
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    inputBox.current?.querySelector("input")?.setSelectionRange(caret, caret);
  }, [chatValue]);
  /* Keep the overlay lined up with a draft too long for the box */
  const syncOverlay = () => {
    const input = inputBox.current?.querySelector("input");
    if (input && overlay.current) overlay.current.scrollLeft = input.scrollLeft;
  };
  useLayoutEffect(syncOverlay);
  const editDraft = (value: string) => {
    setChatValue(value);
    setHighlighted(0);
    setShowError(false);
  };
  /* Puts `value` in the box with the caret after it. Focused now, inside the tap, since a phone only
   * opens its keyboard for a focus made by the tap itself; the caret moves once it has rendered */
  const typeIntoBox = (value: string) => {
    inputBox.current?.querySelector("input")?.focus({ preventScroll: true });
    pendingCaret.current = value.length;
    editDraft(value);
  };
  const pickCommand = (suggestion: ChatSuggestion) => typeIntoBox(`${prefix}${suggestion.value} `);

  /* Enter: finish the word being typed, move on to the next argument, or send */
  const submit = () => {
    const picked = highlightedOption;
    const typed = draft.typed.toLowerCase();
    const isExact = (s: ChatSuggestion) =>
      s.value.replace(/^\//, "").toLowerCase() === typed ||
      s.aliases?.includes(`/${typed}`) ||
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
    const items = links
      .filter((link) => message.includes(`[${link.name}]`))
      .map((link) => link.id)
      .slice(0, MAX_LINKS);
    if (message !== "") socket.emit("message", { message, items });
    setTabChat(false);
  };

  const myMessages = messages?.filter?.((m) => m?.from === hero?.profile?.userName);

  return (
    <MenuButton
      /* Enter opens chat; hide shortcut while open so Enter in the input only sends and closes.
       * Escape (menu-bar) or clicking this button again also closes it. */
      keyboardKey={tabChat ? undefined : "ENTER"}
      iconName="chat"
      springOpen
      sx={{
        flex: tabChat ? 1 : "unset",
        "&.active::before, &:has(.pressed)::before": { boxShadow: "none" },
      }}
      isActive={tabChat}
      onClick={() => {
        if (chatButtonTypes(tabChat, inputBox)) return;
        setTabChat((prev) => !prev);
      }}
    >
      {tabChat && (
        <Box
          as="form"
          {...{ [CHAT_DROP_ATTR]: true }}
          /* The chat button toggles chat on any press inside it and swallows the tap. Presses in
           * the box (`/`, a suggestion, the input) stop here and reach their own controls. Both
           * kinds: a phone sends mouse events after the touch ones */
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
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
                typeIntoBox("/");
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
            {(ghost || hasDraftLinks) && (
              /* Same box as the input, with the draft invisible, so the ghost lines up after it */
              <Box
                aria-hidden
                ref={overlay}
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
                {hasDraftLinks ? (
                  draftParts.map((part, i) =>
                    typeof part === "string" ? (
                      <span key={i}>{part}</span>
                    ) : (
                      <Box as="span" key={i} sx={{ color: part.rarity }}>
                        [{part.name}]
                      </Box>
                    ),
                  )
                ) : (
                  <span style={{ visibility: "hidden" }}>{chatValue}</span>
                )}
                <Box
                  as="span"
                  sx={
                    dropPreview
                      ? { color: dropPreview.rarity, opacity: 0.6 }
                      : showError && draft.invalid
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
                ...(hasDraftLinks && {
                  color: "transparent",
                  caretColor: "white",
                  textShadow: "none",
                }),
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
              onScroll={syncOverlay}
              onSelect={(e) => {
                const input = e.currentTarget;
                const { selectionStart: at, selectionEnd } = input;
                if (at === null || at !== selectionEnd) return;
                const snapped = snapChatCaret(input.value, linkNames, at, lastCaret.current);
                if (snapped !== at) input.setSelectionRange(snapped, snapped);
                lastCaret.current = snapped;
              }}
              onChange={(e) => {
                const typed = e.target.value;
                const { value, caret } = editChatDraft(chatValue, typed, linkNames);
                if (value !== typed) pendingCaret.current = caret;
                editDraft(value);
              }}
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
