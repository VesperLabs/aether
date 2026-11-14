import {
  getCatalogItem,
  readRef,
  resolveAsset,
  type ActorDefinition,
  type AnyItemRef,
  type BuiltItem,
} from "@/content";
import { Flex, ItemTooltip, Text } from "@/ui";
import { useId, useState } from "react";
import { SpriteFace } from "./card-pool";
import { QuestIcon } from "./quest-icon";
import { Divider, PAPER } from "./paper";

/** What a keeper offers: the quests it gives, the shop it keeps and a respawn point. */
export const TradeSections = ({ actor }: { actor: ActorDefinition }) => {
  const { quests = [], shop = [], home } = actor;
  return (
    <>
      {quests.length > 0 && (
        <>
          <Divider label="Quests" />
          <Flex sx={{ gap: 1, flexWrap: "wrap" }}>
            {quests.map((id) => (
              <QuestIcon key={id} id={id} bare />
            ))}
          </Flex>
        </>
      )}
      {shop.length > 0 && (
        <>
          <Divider label="Shop" />
          <Flex sx={{ gap: 1, flexWrap: "wrap" }}>
            {shop.map(({ item }) => (
              <ShopItem key={readRef(item).key} item={item} />
            ))}
          </Flex>
        </>
      )}
      {home && (
        <>
          <Divider />
          <Text sx={{ display: "block", fontSize: 1, color: PAPER.muted, textAlign: "center" }}>
            Can set your respawn point here
          </Text>
        </>
      )}
    </>
  );
};

/** One item for sale: just its sprite, with the game's item tooltip on hover. */
const ShopItem = ({ item: ref }: { item: AnyItemRef }) => {
  const [hovering, setHovering] = useState(false);
  const tooltipId = useId();
  const item = getCatalogItem(ref);
  const asset = item && resolveAsset(item, { profile: { race: "human", gender: "female" } });
  if (!item || !asset) return null;
  return (
    <Flex
      data-tooltip-id={tooltipId}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      sx={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", cursor: "help" }}
    >
      <SpriteFace asset={asset} tint={item.tint} size={32} pixelScale={1} />
      <ItemTooltip item={item as BuiltItem} show={hovering} tooltipId={tooltipId} />
    </Flex>
  );
};
