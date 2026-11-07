import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex, Text } from "theme-ui";
import { CONTROL_GOLD } from "./modal-gilding";

const LIST_MAX_HEIGHT = 260;

const LIST_SX: ThemeUIStyleObject = {
  position: "absolute",
  zIndex: "menus",
  left: 0,
  right: 0,
  p: 1,
  maxHeight: LIST_MAX_HEIGHT,
  overflowY: "auto",
  bg: "yellow.900",
  border: "1px solid #000",
  borderRadius: 4,
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, .25), 0 4px 10px rgba(0, 0, 0, .5)",
};

export interface SelectOption {
  value: string;
  label: string;
  /** Shown before the label in the open list. */
  icon?: ReactNode;
}

/** A dropdown in the game's look. Arrow keys step through the options without opening it. */
export const Select = ({
  label,
  value,
  options,
  onChange,
  sx,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  sx?: ThemeUIStyleObject;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);

  /* Measured before painting, so the list never flashes on the wrong side. */
  useLayoutEffect(() => {
    if (!open || !rootRef.current || !listRef.current) return;
    const { top, bottom } = rootRef.current.getBoundingClientRect();
    const below = window.innerHeight - bottom;
    setDropUp(listRef.current.offsetHeight > below && top > below);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.scrollIntoView?.({ block: "nearest" });
    const closeOnOutsidePress = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = options[Math.min(options.length - 1, Math.max(0, selectedIndex + step))];
    if (next) onChange(next.value);
  };

  return (
    <Box ref={rootRef} sx={{ position: "relative", minWidth: 0, ...sx }}>
      <Flex
        as="button"
        {...{ type: "button", "aria-haspopup": "listbox", "aria-expanded": open, title: label }}
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
          cursor: "pointer",
          borderRadius: 4,
          lineHeight: 1.25,
          textAlign: "left",
        }}
      >
        <Text sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {options[selectedIndex]?.label}
        </Text>
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
      {open && (
        <Box
          ref={listRef}
          role="listbox"
          aria-label={label}
          sx={{ ...LIST_SX, ...(dropUp ? { bottom: "100%", mb: 1 } : { top: "100%", mt: 1 }) }}
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
                  fontSize: 1,
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
        </Box>
      )}
    </Box>
  );
};
