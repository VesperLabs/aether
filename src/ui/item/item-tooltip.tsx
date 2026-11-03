import { Fragment } from "react";
import { describeItem, type DescribableItem, type DescribePlayer } from "@/rules/inventory";
import { Flex, Text } from "theme-ui";
import { theme } from "@/ui/kit/theme";
import { Tooltip, TooltipContent } from "@/ui/kit/tooltip";
import {
  BODY_ICON,
  BuffName,
  FadedRule,
  Level,
  SectionTitle,
  StatGrid,
  StatRows,
  StatSection,
  TriggerRows,
  TYPE,
  spellIcon,
} from "./item-lines";
import { GildedCorners } from "./gilded-corners";
import { ArtIcon, DEFAULT_ASSET_USER } from "./art-icon";
import { resolveAsset } from "@/content/sprites/resolve-asset";
import { BuiltItem } from "@/content/items/item-types";

const RESOURCE_ICONS = { mp: "mana", hp: "health", sp: "stamina" } as const;

const HINT_STYLE = {
  ...TYPE.meta,
  fontStyle: "italic",
  color: "gray.400",
  textTransform: "none",
  textAlign: "center",
  maxWidth: 200,
  whiteSpace: "normal",
} as const;

/** The art shown by an item's name: a spell's own icon, or the item as the bag shows it. */
function itemArt(item: DescribableItem, player?: DescribePlayer | null) {
  if (item.type === "spell" || item.slot === "spell") {
    return item.base ? { src: spellIcon(item.base) } : undefined;
  }
  const wearer = (player as { profile?: object } | null)?.profile ? player : DEFAULT_ASSET_USER;
  const asset = resolveAsset(item as BuiltItem, wearer as Parameters<typeof resolveAsset>[1]);
  return (
    asset && { src: asset.src, rect: asset.previewRect, tint: (item as { tint?: string }).tint }
  );
}

/** Rarities whose tooltip is gilded: all but common. */
const GILDED_RARITIES = ["magic", "rare", "unique", "set"];

/** A gilded rarity's own colour, at full strength. */
function gildColor(rarity?: string) {
  if (!rarity || !GILDED_RARITIES.includes(rarity)) return undefined;
  return (theme.colors as unknown as Record<string, string>)[rarity];
}

/** A magic or better item's tooltip is framed in its rarity's colour, arrow and all. */
function gilding(rarity?: string) {
  const gold = gildColor(rarity);
  if (!gold) return undefined;
  return {
    border: `1px solid ${gold}`,
    /* A hard dark line outside the gilding, so it reads on light and busy backgrounds */
    style: { boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.9)" },
  };
}

interface ItemTooltipProps {
  item?: DescribableItem | null;
  /** Checks requirements and the set bonus against this player; omit to show the plain item. */
  player?: DescribePlayer | null;
  tooltipId: string;
  /** Controlled visibility; omit to open on hovering the `data-tooltip-id` anchor. */
  show?: boolean;
}

/** The item tooltip, shared by the game HUD and the wiki. */
export const ItemTooltip = ({ item, player, tooltipId, show }: ItemTooltipProps) => {
  if (!item) return null;
  const d = describeItem(item, player);
  const setColor = d.set?.active ? "set" : "gray.500";
  const art = itemArt(item, player);

  return (
    <Tooltip id={tooltipId} isOpen={show} {...gilding(d.rarity)}>
      {gildColor(d.rarity) && <GildedCorners color={gildColor(d.rarity)!} rarity={d.rarity!} />}
      <TooltipContent sx={{ px: 2, py: "6px", minWidth: 150 }}>
        <Flex sx={{ alignItems: "center", gap: 2, width: "100%" }}>
          {/* Name and rarity together are 32px tall, the same as the art beside them */}
          {art && <ArtIcon {...art} size={32} />}
          <Flex sx={{ flexDirection: "column", alignItems: "flex-start" }}>
            <Text sx={TYPE.name}>
              {d.title}
              {!!d.amount && (
                <Text sx={{ ...TYPE.meta, ml: 1, color: "gray.400" }}>×{d.amount}</Text>
              )}
              {!!d.level && <Level level={d.level} />}
            </Text>
            <Text sx={{ ...TYPE.meta, color: d.rarity }}>
              {d.rarity} {d.kind}
            </Text>
          </Flex>
        </Flex>
        <StatSection title="Stats" lines={d.stats} />
        <StatSection title="Effects" lines={d.effects} />
        {d.buffs.map((buff) => (
          <Fragment key={buff.name}>
            <SectionTitle>Casts</SectionTitle>
            {/* A self-buff spell (Endurance) already shows its icon and name up top */}
            {buff.name !== item.base && (
              <BuffName name={buff.name} level={buff.level} sx={{ alignSelf: "flex-start" }} />
            )}
            <StatGrid>
              <StatRows lines={buff.stats} />
            </StatGrid>
          </Fragment>
        ))}
        {d.triggers.length > 0 && (
          <>
            <SectionTitle>Procs</SectionTitle>
            <StatGrid>
              <TriggerRows triggers={d.triggers} />
            </StatGrid>
          </>
        )}
        {d.requirements.length > 0 && (
          <>
            <SectionTitle>Requires</SectionTitle>
            <StatGrid>
              {d.requirements.map(({ label, value, met }) => (
                <StatRows
                  key={label}
                  lines={[{ label, value }]}
                  color={met ? undefined : "danger"}
                />
              ))}
            </StatGrid>
          </>
        )}
        {d.set && (
          <>
            <SectionTitle color={setColor}>
              {d.set.name}
              {d.set.pieces ? ` (${d.set.pieces})` : ""}
            </SectionTitle>
            <StatGrid>
              <StatRows lines={d.set.stats} color={setColor} />
              <TriggerRows triggers={d.set.triggers} color={setColor} />
            </StatGrid>
          </>
        )}
        {d.space && (
          <>
            <SectionTitle>Space</SectionTitle>
            <Text sx={TYPE.body}>{`${d.space.used} / ${d.space.total}`}</Text>
          </>
        )}
        {(d.description || d.action) && (
          <>
            <FadedRule />
            {d.description && <Text sx={HINT_STYLE}>{d.description}</Text>}
            {d.action && <Text sx={HINT_STYLE}>Double click to {d.action}</Text>}
          </>
        )}
        <FadedRule />
        <Flex sx={{ ...TYPE.body, alignItems: "center", gap: 3 }}>
          <Flex sx={{ alignItems: "center", gap: 1 }}>
            <ArtIcon src="./assets/icons/gold.png" size={BODY_ICON} />
            {d.cost}
          </Flex>
          {d.resourceCosts.map(({ resource, amount }) => (
            <Flex key={resource} sx={{ alignItems: "center", gap: 1 }}>
              <ArtIcon src={`./assets/icons/${RESOURCE_ICONS[resource]}.png`} size={BODY_ICON} />-
              {amount}
            </Flex>
          ))}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
