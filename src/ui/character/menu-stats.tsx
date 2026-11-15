import { memo, type ReactNode } from "react";
import { convertMsToS } from "@/rules/stats";
import { SectionTitle, StatRow } from "@/ui/item";
import {
  arePropsEqualWithKeys,
  Box,
  Flex,
  Icon,
  Menu,
  MenuHeader,
  resourceToken,
  Text,
} from "@/ui/kit";
import type { CharacterMenuProps } from "./menu-props";

type Stats = NonNullable<CharacterMenuProps["player"]>["stats"];

/** Narrow enough for three columns on a phone held sideways, two upright. */
const COLUMN_MIN = 136;
/** Never wider, so a wide screen doesn't stretch the rows into long empty leaders. */
const COLUMN_MAX = 200;
/** A size up from a tooltip's rows: this is a screen to read, not a hover. */
const ROW_TYPE = { fontSize: 2, lineHeight: "20px" };
/** Labels in the menu's own white: its wood is too light for grey. Values are the bold ones. */
const LABEL = "text";
/** Section titles: a very light grey, a step back from the white rows. */
const TITLE = "gray.200";
/** The DMG and RES columns of the elements table: wide enough for "12–34" and "100%". */
const CELL = 44;
/** The element icons' own size: shown whole and unscaled, so no pixel is cut or smeared. */
const ELEMENT_ICON = 24;

/** A short label with its full name on hover, as tooltip rows read. */
const Short = ({ label, title }: { label: string; title: string }) => (
  <Text title={title} sx={{ ...ROW_TYPE, color: LABEL }}>
    {label}
  </Text>
);

const row = (label: string, value: ReactNode, title?: string) => (
  <StatRow
    key={label}
    type={ROW_TYPE}
    /* Every label and value styled here, so none falls back to the tooltip's smaller grey */
    label={<Short label={label} title={title ?? label} />}
    value={
      typeof value === "string" ? (
        <Text sx={{ ...ROW_TYPE, fontWeight: "bold" }}>{value}</Text>
      ) : (
        value
      )
    }
  />
);

/** A value in a fixed-width cell, right-aligned, so a table's columns line up. */
const Cell = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <Text
    sx={{
      ...ROW_TYPE,
      width: CELL,
      textAlign: "right",
      fontWeight: muted ? "normal" : "bold",
      color: muted ? LABEL : undefined,
    }}
  >
    {children}
  </Text>
);

/** Each element, with its icon in `assets/icons/elements/`; holy can't be resisted. */
const ELEMENTS = ["fire", "water", "earth", "light", "holy"] as const;

const Elements = ({ stats }: { stats: Stats }) => {
  const s = stats as unknown as Record<string, number | undefined>;
  return (
    <>
      <Flex sx={{ justifyContent: "flex-end" }}>
        <Cell muted>DMG</Cell>
        <Cell muted>RES</Cell>
      </Flex>
      {ELEMENTS.map((name) => {
        const title = name[0].toUpperCase() + name.slice(1);
        const resistance = s[`${name}Resistance`];
        return (
          <Flex key={name} title={title} sx={{ alignItems: "center", height: ELEMENT_ICON }}>
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Icon icon={`./assets/icons/elements/${name}.png`} size={ELEMENT_ICON} />
              <Short label={title} title={title} />
            </Box>
            <Cell>
              {s[`min${title}Damage`] ?? 0}–{s[`max${title}Damage`] ?? 0}
            </Cell>
            <Cell muted={resistance === undefined}>
              {resistance === undefined ? "—" : `${resistance.toFixed(0)}%`}
            </Cell>
          </Flex>
        );
      })}
    </>
  );
};

/** A titled block that stays whole: the column flow moves it, never splits it. */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box sx={{ breakInside: "avoid", pb: 2 }}>
    <SectionTitle color={TITLE}>{title}</SectionTitle>
    {children}
  </Box>
);

/** The character's numbers, laid out like an item tooltip: titled sections of dotted rows. */
export const MenuStats = memo(
  ({ player, isOpen, setIsOpen, nextHand }: CharacterMenuProps) => {
    /* Dual-wielding, each hand swings with its own weapon's damage, speed and crit: show the next */
    const stats =
      nextHand === "handLeft" && player?.offHandStats ? player.offHandStats : player?.stats;
    if (!stats) return null;
    return (
      <Menu sx={{ display: isOpen ? "flex" : "none" }}>
        <MenuHeader icon={`./assets/icons/stats.png`} onClick={() => setIsOpen(false)}>
          Stats
        </MenuHeader>
        {/* Sections flow down balanced columns, as many as fit, so a phone never shows a
            short column beside a tall one with a hole under it */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 3 * COLUMN_MAX + 4 * 16,
            mx: "auto",
            /* Clear of the menu's edges, as its other panels sit */
            px: 3,
            boxSizing: "border-box",
            columnWidth: COLUMN_MIN,
            columnCount: 3,
            columnGap: 3,
            "& > :first-of-type > :first-of-type": { mt: 0 },
          }}
        >
          <Section title="Attributes">
            {row("Strength", String(stats.strength))}
            {row("Dexterity", String(stats.dexterity))}
            {row("Intelligence", String(stats.intelligence))}
            {row("Vitality", String(stats.vitality))}
          </Section>
          <Section title="Offense">
            {row("Damage", `${stats.minDamage}–${stats.maxDamage}`)}
            {row("Spell power", String(stats.spellPower))}
            {row("Crit chance", `${stats.critChance?.toFixed(1)}%`, "Crit chance")}
            {row("Crit multiplier", `${stats.critMultiplier?.toFixed(1)}x`)}
            {row("Armor pierce", String(stats.armorPierce))}
            {row("Accuracy", String(stats.accuracy))}
          </Section>
          <Section title="Defense">
            {row("Defense", String(stats.defense))}
            {row("Dodge chance", `${stats.dodgeChance?.toFixed(1)}%`, "Dodge chance")}
            {row("Block chance", `${stats.blockChance?.toFixed(1)}%`, "Block chance")}
          </Section>
          <Section title="Regen">
            {row(
              "HP · MP · SP",
              <Text sx={{ ...ROW_TYPE, fontWeight: "bold" }}>
                <Text sx={{ color: "danger" }}>+{stats.regenHp}</Text>{" "}
                <Text sx={{ color: resourceToken("mp") }}>+{stats.regenMp}</Text>{" "}
                <Text sx={{ color: resourceToken("sp") }}>+{stats.regenSp}</Text>
              </Text>,
              "Health, mana and stamina regenerated",
            )}
          </Section>
          <Section title="Speed">
            {row("Attack delay", String(convertMsToS(stats.attackDelay)))}
            {row("Cast delay", String(convertMsToS(stats.castDelay)))}
            {row("Walk speed", String(Math.round(stats.walkSpeed)))}
          </Section>
          <Section title="Elements">
            <Elements stats={stats} />
          </Section>
          <Section title="Loot">{row("Magic find", `${stats.magicFind}%`)}</Section>
        </Box>
      </Menu>
    );
  },
  arePropsEqualWithKeys(["isOpen", "player.stats", "player.offHandStats", "nextHand"]),
);
