import type { ReactNode } from "react";
import { Textarea } from "theme-ui";
import { Box, Button, Flex, Text } from "@/ui";
import { CORE_PROMPTS, type CorePromptId } from "./core-prompts";
import { SheetThumb } from "./sheet-thumb";

const TAB_SIZE = 34;
const TAB_RADIUS = 8;
const TAB_ICONS: Record<CorePromptId, ReactNode> = {
  human: <SheetThumb texture="human" />,
  /* No sheet shows a diagonal, so the arrow says what the tab does to the sprite. */
  quarterTurn: (
    <Box sx={{ position: "relative" }}>
      <SheetThumb texture="human" />
      <Text sx={{ position: "absolute", right: -1, bottom: -1, fontSize: 0, lineHeight: 1 }}>
        ↗️
      </Text>
    </Box>
  ),
};

const TEXTAREA_SX = {
  color: "text",
  fontFamily: "body",
  resize: "vertical",
  /* Theme UI grows textareas to fit their text, which would ignore `rows`. */
  fieldSizing: "fixed",
  lineHeight: 1.25,
  flexShrink: 0,
} as const;

/** What's typed for this draw. */
export const AdditionsField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <>
    <Text sx={{ fontSize: 1, opacity: 0.5 }}>Your additions</Text>
    <Textarea
      aria-label="Your additions"
      placeholder="Add a red scarf"
      rows={4}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      variant="forms.input"
      sx={TEXTAREA_SX}
    />
  </>
);

/** The vertical group of tabs on the textarea's side, one per core prompt. */
const PromptTabs = ({ tab, onTab }: { tab: CorePromptId; onTab: (tab: CorePromptId) => void }) => (
  <Flex
    sx={{
      position: "absolute",
      zIndex: 1,
      top: 2,
      right: "100%",
      mr: 1,
      flexDirection: "column",
    }}
  >
    {CORE_PROMPTS.map(({ id, label }) => (
      <Button
        key={id}
        variant="wood"
        className={id === tab ? "active" : ""}
        aria-label={label}
        aria-pressed={id === tab}
        title={label}
        onClick={() => onTab(id)}
        sx={{
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          width: TAB_SIZE,
          height: TAB_SIZE,
          p: 0,
          fontSize: 2,
          /* Square where they meet, so they read as one group. */
          borderRadius: 0,
          "&:first-of-type": { borderTopLeftRadius: TAB_RADIUS, borderTopRightRadius: TAB_RADIUS },
          "&:last-of-type": {
            borderBottomLeftRadius: TAB_RADIUS,
            borderBottomRightRadius: TAB_RADIUS,
          },
          /* Sits over the last button's bottom border, leaving one line between them. */
          "& + button": { mt: "-1px" },
          transition: "none",
          filter: id === tab ? "brightness(1.25)" : "brightness(0.8)",
        }}
      >
        {TAB_ICONS[id]}
      </Button>
    ))}
  </Flex>
);

/** The two prompt boxes: the locked core prompt, then what's added for this draw. */
export const PromptFields = ({
  core,
  prompt,
  tab,
  onTab,
  onPrompt,
}: {
  core: string;
  prompt: string;
  tab: CorePromptId;
  onTab: (tab: CorePromptId) => void;
  onPrompt: (prompt: string) => void;
}) => (
  <>
    <Text sx={{ fontSize: 1, opacity: 0.5 }}>Core prompt</Text>
    <Box sx={{ position: "relative", flexShrink: 0 }}>
      <PromptTabs tab={tab} onTab={onTab} />
      <Textarea
        aria-label="Core prompt"
        rows={6}
        value={core}
        readOnly
        variant="forms.input"
        sx={{ ...TEXTAREA_SX, opacity: 0.7 }}
      />
    </Box>
    <AdditionsField value={prompt} onChange={onPrompt} />
  </>
);
