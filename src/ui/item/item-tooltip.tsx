import { Fragment } from "react";
import { describeItem, type DescribableItem, type DescribePlayer } from "@/rules/inventory";
import { Divider, Flex, Icon, Text, TextDivider, Tooltip, TooltipContent } from "@/ui/kit";
import { StatLines, StatSection, TriggerLines } from "./item-lines";

const RESOURCE_ICONS = { mp: "mana", hp: "health", sp: "stamina" } as const;

const HINT_STYLE = {
  fontStyle: "italic",
  fontWeight: "normal",
  color: "gray.400",
  textTransform: "none",
} as const;

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

  return (
    <Tooltip id={tooltipId} isOpen={show}>
      <TooltipContent>
        <Text>
          {d.title}
          {d.amount && (
            <Text color="gray.400" sx={{ ml: "2px" }}>
              ({d.amount})
            </Text>
          )}
          {d.level && <span> (Lv. {d.level})</span>}
        </Text>
        <Text color={d.rarity}>
          {d.rarity} {d.kind}
        </Text>
        <StatSection title="Stats" lines={d.stats} />
        <StatSection title="Effects" lines={d.effects} />
        {d.buffs.map((buff) => (
          <Fragment key={buff.name}>
            <TextDivider>
              {buff.name} Buff (Lv. {buff.level})
            </TextDivider>
            <StatLines lines={buff.stats} />
          </Fragment>
        ))}
        <TriggerLines triggers={d.triggers} />
        {d.requirements.length > 0 && <TextDivider>Requirements</TextDivider>}
        {d.requirements.map(({ label, value, met }) => (
          <StatLines key={label} lines={[{ label, value }]} color={met ? "text" : "danger"} />
        ))}
        {d.set && (
          <>
            <TextDivider>
              {d.set.name}{" "}
              <Text color={setColor} sx={{ fontSize: 0 }}>
                ({d.set.pieces} piece)
              </Text>
            </TextDivider>
            <StatLines lines={d.set.stats} color={setColor} />
            <TriggerLines triggers={d.set.triggers} color={setColor} />
          </>
        )}
        {d.space && (
          <>
            <TextDivider>Space</TextDivider>
            {`${d.space.used} / ${d.space.total}`}
          </>
        )}
        <Divider />
        {d.action && (
          <>
            <Text sx={HINT_STYLE}>Double click to {d.action}</Text>
            <Divider />
          </>
        )}
        {d.description && (
          <>
            <Text sx={{ ...HINT_STYLE, textAlign: "center", maxWidth: 200, whiteSpace: "normal" }}>
              {d.description}
            </Text>
            <Divider />
          </>
        )}
        <Flex sx={{ alignItems: "center", gap: 2 }}>
          <Flex sx={{ alignItems: "center", gap: "2px" }}>
            <Icon icon="./assets/icons/gold.png" size={16} />
            {d.cost}
          </Flex>
          {d.resourceCosts.map(({ resource, amount }) => (
            <Flex key={resource} sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon={`./assets/icons/${RESOURCE_ICONS[resource]}.png`} size={16} />-{amount}
            </Flex>
          ))}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
