import { Icon } from "@/ui";
import type { ReactNode } from "react";
import { CARD_COLORS, SpriteFace, raceAsset } from "./card-pool";
import { ICON, NATIVE_ICON, Row } from "./card-row";
import type { itemSources } from "./item-sources";
import { PAPER } from "./paper";

/** "1 in N" odds as a percent: 1 in 3 is 33%, 1 in 2000 is 0.05%. */
function percent(oneIn: number) {
  const value = 100 / oneIn;
  return `${value >= 1 ? Math.round(value) : Number(value.toPrecision(1))}%`;
}

/**
 * Monsters that drop the item, keepers that sell it, quests that give it and maps that spawn it,
 * each with an icon; then any monster of high enough level, when it is in the random drop pool.
 */
export const Sources = ({
  sources,
  randomLevels,
}: {
  sources: ReturnType<typeof itemSources>;
  /** The monster levels that drop it at random, if it ever drops at random. */
  randomLevels?: { min: number; max: number };
}) => {
  const icon = (name: string) => <Icon icon={`./assets/icons/${name}.png`} size={NATIVE_ICON} />;
  const rows: { label: string; value: string; color: string; icon: ReactNode }[] = [
    ...(sources?.drops ?? []).map((drop) => {
      const asset = raceAsset(drop.race);
      return {
        label: drop.name,
        value: percent(drop.chance),
        color: CARD_COLORS.drop,
        icon: asset && <SpriteFace asset={asset} tint={drop.tint} size={ICON} />,
      };
    }),
    ...(sources?.sellers ?? []).map((name) => ({
      label: name,
      value: "Shop",
      color: CARD_COLORS.shop,
      icon: icon("pouch"),
    })),
    ...(sources?.quests ?? []).map((name) => ({
      label: name,
      value: "Quest",
      color: CARD_COLORS.unique,
      icon: icon("quests"),
    })),
    ...(sources?.spawns ?? []).map(({ map, chance }) => ({
      label: map,
      value: percent(chance),
      color: PAPER.ink,
      icon: icon("chest"),
    })),
  ];
  if (randomLevels) {
    rows.push({
      label: "Any monster",
      value: `Lv ${randomLevels.min}–${randomLevels.max}`,
      color: CARD_COLORS.drop,
      icon: icon("chest"),
    });
  }
  /* Nothing gives it yet: say so, rather than promise a drop that never happens */
  if (!rows.length) {
    rows.push({ label: "Not found yet", value: "0%", color: PAPER.muted, icon: icon("danger") });
  }
  return (
    <>
      {rows.map((row, i) => (
        <Row
          key={`${row.label}-${i}`}
          icon={row.icon ?? <span />}
          label={row.label}
          value={row.value}
          labelColor={row.color}
        />
      ))}
    </>
  );
};
