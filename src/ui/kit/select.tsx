import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex, Text } from "theme-ui";
import { CONTROL_GOLD } from "./modal-gilding";
import { CONTROL_TEXT } from "./theme";

const LIST_MAX_HEIGHT = 260;

/** Room between the box and its open list, in pixels. */
const LIST_GAP = 4;

/*
 * The open list lives on the page, not in the box's panel, so no window or modal that scrolls or
 * clips its contents can cut it off. It's placed by the box's spot on screen.
 */
const LIST_SX: ThemeUIStyleObject = {
  position: "fixed",
  zIndex: "dropdown",
  p: 1,
  maxHeight: LIST_MAX_HEIGHT,
  width: "max-content",
  overflowY: "auto",
  bg: "yellow.900",
  border: "1px solid #000",
  borderRadius: 4,
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, .25), 0 4px 10px rgba(0, 0, 0, .5)",
};

export interface SelectOption {
  value: string;
  label: string;
  /** Shown before the label, in the open list and on the closed box. */
  icon?: ReactNode;
}

/** A dropdown in the game's look. Arrow keys step through the options without opening it. */
export const Select = ({
  label,
  value,
  options,
  onChange,
  placeholder = "None",
  disabled = false,
  sx,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Shown dimmed when the value is none of the options, so the box keeps its size. */
  placeholder?: string;
  /** Shown dimmed, and it won't open or change. */
  disabled?: boolean;
  sx?: ThemeUIStyleObject;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  /* Where the box is on screen, which places the list */
  const [anchor, setAnchor] = useState<DOMRect>();
  const selectedIndex = options.findIndex((option) => option.value === value);

  /* Measured before painting, so the list never flashes on the wrong side. It follows the box as
     the page or its window scrolls, resizes or is dragged. */
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const place = () => {
      if (!rootRef.current) return;
      const box = rootRef.current.getBoundingClientRect();
      const below = window.innerHeight - box.bottom;
      const height = listRef.current?.offsetHeight ?? 0;
      setDropUp(height > below && box.top > below);
      setAnchor(box);
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("pointermove", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("pointermove", place);
    };
  }, [open]);

  /* Once the list is on screen its height is known: open it upward if it won't fit below */
  const isPlaced = !!anchor;
  useLayoutEffect(() => {
    if (!open || !isPlaced || !rootRef.current || !listRef.current) return;
    const { top, bottom } = rootRef.current.getBoundingClientRect();
    const below = window.innerHeight - bottom;
    setDropUp(listRef.current.offsetHeight > below && top > below);
  }, [open, isPlaced]);

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.scrollIntoView?.({ block: "nearest" });
    const closeOnOutsidePress = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape") setOpen(false);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = options[Math.min(options.length - 1, Math.max(0, selectedIndex + step))];
    if (next) onChange(next.value);
  };

  return (
    <Box ref={rootRef} sx={{ position: "relative", width: "100%", minWidth: 0, ...sx }}>
      <Flex
        as="button"
        {...{
          type: "button",
          "aria-haspopup": "listbox",
          "aria-expanded": open,
          title: label,
          disabled,
        }}
        aria-label={label}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        variant="forms.input"
        sx={{
          width: "100%",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          color: "text",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          borderRadius: 4,
          textAlign: "left",
        }}
      >
        {/* Every option sits in one grid cell, icon and all, unseen but for the chosen one, so the
            box is always the size of the biggest and never changes with the value. */}
        <Box sx={{ display: "grid", alignItems: "center", minWidth: 0, flex: 1 }}>
          {options.map((option) => (
            <Flex
              key={option.value}
              aria-hidden={option.value !== value || undefined}
              sx={{
                gridArea: "1 / 1",
                alignItems: "center",
                gap: 2,
                minWidth: 0,
                /* inherit, not visible, so a hidden tab or panel hides it too */
                visibility: option.value === value ? "inherit" : "hidden",
              }}
            >
              {option.icon}
              <Text sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {option.label}
              </Text>
            </Flex>
          ))}
          {selectedIndex < 0 && (
            <Flex sx={{ gridArea: "1 / 1", alignItems: "center", minWidth: 0 }}>
              <Text
                sx={{
                  opacity: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {placeholder}
              </Text>
            </Flex>
          )}
        </Box>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: `4px solid ${CONTROL_GOLD}`,
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </Flex>
      {open &&
        !disabled &&
        anchor &&
        createPortal(
          <Box
            ref={listRef}
            role="listbox"
            aria-label={label}
            sx={LIST_SX}
            style={{
              left: anchor.left,
              /* At least as wide as the box, and wider when its options need it */
              minWidth: Math.max(anchor.width, 0),
              ...(dropUp
                ? { bottom: window.innerHeight - anchor.top + LIST_GAP }
                : { top: anchor.bottom + LIST_GAP }),
            }}
          >
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Flex
                  key={option.value}
                  ref={selected ? selectedRef : undefined}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  sx={{
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1,
                    ...CONTROL_TEXT,
                    borderRadius: 3,
                    cursor: "pointer",
                    color: selected ? CONTROL_GOLD : "text",
                    bg: selected ? "shadow.30" : "transparent",
                    "&:hover": { bg: "shadow.25" },
                  }}
                >
                  {option.icon}
                  {option.label}
                </Flex>
              );
            })}
          </Box>,
          document.body,
        )}
    </Box>
  );
};
