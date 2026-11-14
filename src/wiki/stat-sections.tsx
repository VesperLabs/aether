import { getCatalogItem, type ActorDefinition } from "@/content";
import { calculateExpValue, npcStats } from "@/rules/stats";
import { Flex, Grid, Icon, Text, Tooltip, TooltipContent } from "@/ui";
import { useId } from "react";
import { fights } from "./combat-sections";
import { Divider } from "./paper";
import { ItemHover, ROW_STYLE, Stat } from "./stat-row";

/** What every actor shares, keeper or mob: its stats and resistances. */
export const StatsSection = ({ actor }: { actor: ActorDefinition }) => {
  const stats = npcStats(actor);
  return (
    <>
      <Divider label="Stats" />
      <Grid columns={2} sx={{ columnGap: 4, rowGap: 1, fontSize: 1 }}>
        <Stat label="HP" value={Math.round(stats.maxHp)} />
        <Stat label="MP" value={Math.round(stats.maxMp)} />
        <Stat
          label="Damage"
          value={`${Math.round(stats.minDamage)}–${Math.round(stats.maxDamage)}`}
        />
        <Stat label="Defense" value={Math.round(stats.defense)} />
        <Stat label="Attack" value={`${(stats.attackDelay / 1000).toFixed(1)}s`} />
        <Stat label="Speed" value={Math.round(stats.walkSpeed)} />
        <Stat label="Crit" value={`${Number(stats.critChance.toFixed(1))}%`} />
        {/* Only what you can fight is worth experience. */}
        {fights(actor) && (
          <Stat
            label="EXP"
            value={calculateExpValue({ playerLevel: stats.level, mobLevel: stats.level })}
          />
        )}
      </Grid>
      {/* Resistances: the element icons speak for themselves. */}
      <Flex sx={{ justifyContent: "space-between", gap: 2, mt: 3, fontSize: 1 }}>
        {ELEMENTS.map((element) => (
          <Resistance
            key={element}
            element={element}
            value={Math.round(stats[`${element}Resistance`] ?? 0)}
          />
        ))}
      </Flex>
    </>
  );
};

/** The spells an actor casts: icon and name, two to a row, with the game's item tooltip on hover. */
export const AbilitiesSection = ({ actor }: { actor: ActorDefinition }) => {
  const spells = Object.values(actor.abilities ?? {});
  if (!spells.length) return null;
  return (
    <>
      <Divider label="Abilities" />
      <Grid columns={2} sx={{ columnGap: 2, rowGap: 1, fontSize: 1 }}>
        {spells.map((ref) => {
          const item = getCatalogItem(ref);
          if (!item) return null;
          return (
            <ItemHover key={item.key} gap={1} item={item}>
              {/* The same icon the action bar shows once the spell is bound, at its native 32px */}
              <Icon
                icon={`./assets/atlas/spell/spell-${item.base}.png`}
                size={32}
                // The art sits inside transparent padding; pull the name in to match the elements.
                sx={{ flexShrink: 0, my: "-4px", mr: "-6px" }}
              />
              <Text sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{item.name}</Text>
            </ItemHover>
          );
        })}
      </Grid>
    </>
  );
};

/** The elements a character can resist, each with its icon in `assets/icons/elements/`. */
const ELEMENTS = ["fire", "water", "earth", "light"];

/** One element's resistance: its icon and percentage, named in a tooltip on hover. */
const Resistance = ({ element, value }: { element: string; value: number }) => {
  const tooltipId = useId();
  const name = element[0].toUpperCase() + element.slice(1);
  return (
    <Flex
      data-tooltip-id={tooltipId}
      sx={{ ...ROW_STYLE, alignItems: "center", gap: 1, cursor: "help" }}
    >
      <Icon icon={`./assets/icons/elements/${element}.png`} size={24} sx={{ flexShrink: 0 }} />
      <Text sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{value}%</Text>
      <Tooltip id={tooltipId}>
        <TooltipContent>
          {name} resistance: takes {value}% less {element} damage
        </TooltipContent>
      </Tooltip>
    </Flex>
  );
};
