import { useState, type ReactNode } from "react";
import type { MobProfile } from "@/content";
import { useAppContext } from "@/client/hud/app/context";
import { MenuButton } from "@/client/hud/menu/menu-button";
import { APPEARANCE_OPTIONS as O, type Appearance } from "@/rules/character";
import {
  Box,
  Field,
  Flex,
  Grid,
  KeyboardButton,
  Modal,
  PlayerPortrait,
  Select,
  Text,
  isMobile,
} from "@/ui";
import { BodyPreview, LookPreview, SwatchPreview } from "./look-preview";
import { ModalRename } from "./modal-rename";

/** One dropdown: the options it lists and the choice each one makes. */
interface LookPicker {
  label: string;
  options: readonly string[];
  /** Names an option in the list, counting from 1. */
  optionLabel: (option: string, index: number) => string;
  current: (profile: MobProfile) => string | undefined;
  choose: (option: string) => Appearance;
  /** What an option shows: the part it changes, or a swatch for a colour. */
  preview: (option: string, profile: MobProfile) => ReactNode;
}

/** Room for the tallest look at the largest scale. */
const PORTRAIT_HEIGHT = 150;
/** Fixed, so a wider hairstyle or hat never resizes the modal; the character centres in it. */
const PORTRAIT_WIDTH = 120;
/** Fits the longest option name ("Color 12") beside the arrow, with room to breathe. */
const SELECT_WIDTH = 88;

const numbered = (noun: string) => (_option: string, index: number) => `${noun} ${index + 1}`;

/** A part per row, its style and colour side by side, so the column stays short. */
const ROWS: { label: string; pickers: LookPicker[] }[] = [
  {
    label: "Body",
    pickers: [
      {
        label: "Body",
        options: O.gender,
        optionLabel: (option) => option[0].toUpperCase() + option.slice(1),
        current: (p) => p.gender,
        choose: (gender) => ({ gender }),
        preview: (gender, p) => (
          <BodyPreview gender={gender as MobProfile["gender"]} tint={p.tint} />
        ),
      },
      {
        label: "Skin",
        options: O.tint,
        optionLabel: numbered("Tone"),
        current: (p) => p.tint,
        choose: (tint) => ({ tint }),
        preview: (tint) => <SwatchPreview tint={tint} />,
      },
    ],
  },
  {
    label: "Face",
    pickers: [
      {
        label: "Face",
        options: O.faceTexture,
        optionLabel: numbered("Face"),
        current: (p) => p.face?.texture,
        choose: (texture) => ({ face: { texture } }),
        preview: (texture) => <LookPreview texture={`human-${texture}`} />,
      },
    ],
  },
  {
    label: "Hair",
    pickers: [
      {
        label: "Hair",
        options: O.hairTexture,
        optionLabel: numbered("Style"),
        current: (p) => p.hair?.texture,
        choose: (texture) => ({ hair: { texture } }),
        preview: (texture, p) => <LookPreview texture={`human-${texture}`} tint={p.hair?.tint} />,
      },
      {
        label: "Hair color",
        options: O.hairTint,
        optionLabel: numbered("Color"),
        current: (p) => p.hair?.tint,
        choose: (tint) => ({ hair: { tint } }),
        preview: (tint) => <SwatchPreview tint={tint} />,
      },
    ],
  },
  {
    label: "Whiskers",
    pickers: [
      {
        label: "Whiskers",
        options: O.whiskersTexture,
        optionLabel: numbered("Style"),
        current: (p) => p.whiskers?.texture,
        choose: (texture) => ({ whiskers: { texture } }),
        preview: (texture, p) => (
          <LookPreview texture={`human-${texture}`} tint={p.whiskers?.tint} />
        ),
      },
      {
        label: "Whiskers color",
        options: O.whiskersTint,
        optionLabel: numbered("Color"),
        current: (p) => p.whiskers?.tint,
        choose: (tint) => ({ whiskers: { tint } }),
        preview: (tint) => <SwatchPreview tint={tint} />,
      },
    ],
  },
];

/** Your character's look and name, each part picked from a dropdown that previews it. */
export const ModalProfile = () => {
  const { socket, hero, setTabProfile, zoom, bottomOffset } = useAppContext();
  const [renaming, setRenaming] = useState(false);
  const profile = hero?.profile;
  if (!profile) return null;
  const userName = profile.userName ?? "";
  const close = () => setTabProfile(false);

  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={close} />
      <Modal zoom={isMobile ? 1 : zoom} bottomOffset={bottomOffset}>
        <Modal.Header icon="./assets/icons/mirror.png">Profile</Modal.Header>
        <Modal.Body>
          <Flex sx={{ flexDirection: "column", gap: 3 }}>
            {/* Small enough side by side for a phone held upright, so it needs no second layout */}
            <Flex sx={{ gap: 3, alignItems: "flex-end" }}>
              <Flex
                sx={{
                  flexShrink: 0,
                  width: PORTRAIT_WIDTH,
                  height: PORTRAIT_HEIGHT,
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <PlayerPortrait
                  player={hero}
                  scale={3}
                  shadow
                  filteredSlots={["accessory", "helmet", "hands"]}
                />
              </Flex>
              <Grid
                sx={{
                  gridTemplateColumns: `repeat(2, ${SELECT_WIDTH}px)`,
                  columnGap: 2,
                  rowGap: 2,
                }}
              >
                {ROWS.flatMap(({ label: part, pickers }) => [
                  ...pickers.map(({ label, options, optionLabel, current, choose, preview }) => {
                    const value = current(profile);
                    /* A look saved before its colour left the list still shows, as "Custom" */
                    const custom =
                      value && !options.includes(value)
                        ? [{ value, label: "Custom", icon: preview(value, profile) }]
                        : [];
                    return (
                      /* Each dropdown carries its own label, so style and colour never get mixed up */
                      <Field key={label} label={label}>
                        <Select
                          label={label}
                          value={value ?? ""}
                          onChange={(option) => socket.emit("updateProfile", choose(option))}
                          options={[
                            ...custom,
                            ...options.map((option, index) => ({
                              value: option,
                              label: optionLabel(option, index),
                              icon: preview(option, profile),
                            })),
                          ]}
                          sx={{ width: "100%" }}
                        />
                      </Field>
                    );
                  }),
                  /* A part with no colour leaves its second cell empty, so each part keeps a row */
                  ...(pickers.length < 2 ? [<Box key={`${part}-gap`} />] : []),
                ])}
              </Grid>
            </Flex>
            {/* The whole row renames; the pen just shows that it can. */}
            <Flex
              role="button"
              title="Change name"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                bg: "shadow.10",
                p: 1,
                cursor: "pointer",
              }}
              onClick={() => setRenaming(true)}
            >
              <Box sx={{ width: 19 }} />
              <Text>{userName}</Text>
              <MenuButton iconName="pen" size={19} onClick={() => setRenaming(true)} />
            </Flex>
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <KeyboardButton sx={{ flex: 1 }} onClick={close} keyboardKey="ESCAPE">
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
      {renaming && <ModalRename userName={userName} onClose={() => setRenaming(false)} />}
    </>
  );
};
