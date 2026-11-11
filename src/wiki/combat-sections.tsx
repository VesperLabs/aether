import { resolveAsset, type ActorDefinition } from "@/content";
import { isNpcAggressive } from "@/rules/npc-behavior";
import { Box, Flex, Text } from "@/ui";
import { CARD_COLORS, SpriteFace } from "./card-pool";
import { Divider, PAPER } from "./paper";
import { DottedLine } from "./leader";
import { ItemHover, ROW_STYLE, listedItems } from "./stat-row";

/** Does it fight on its own terms: loot to drop, or its own way of fighting? */
export const fights = (actor: ActorDefinition) => Boolean(actor.drops || actor.behaviors?.fight);

/** Green for a temper that won't attack first. */
const PASSIVE_COLOR = "#15803d";

/** "· passive" after the level line, for fighters that leave you be. */
export const PassiveTag = ({ actor }: { actor: ActorDefinition }) =>
  fights(actor) && !isNpcAggressive(actor) ? (
    <Box as="span" sx={{ color: PASSIVE_COLOR }}>
      {" "}
      · passive
    </Box>
  ) : null;

/** What a fighter leaves behind. */
export const DropsSection = ({ actor }: { actor: ActorDefinition }) =>
  actor.drops ? (
    <>
      <Divider label="Drops" />
      <Drops drops={actor.drops} />
    </>
  ) : null;

/** What the monster drops, each in its rarity colour with its 1-in-N chance. */
const Drops = ({ drops }: { drops: NonNullable<ActorDefinition["drops"]> }) => (
  <Box sx={{ textAlign: "left", fontSize: 1 }}>
    {!drops.length && <Text sx={{ color: PAPER.muted, fontStyle: "italic" }}>Nothing</Text>}
    {drops.map((drop) => {
      const item = listedItems[drop.type]?.[drop.rarity]?.[drop.key];
      const asset = item && resolveAsset(item, { profile: { race: "human", gender: "female" } });
      return (
        <Flex key={`${drop.type}-${drop.key}`} sx={{ ...ROW_STYLE, gap: 1 }}>
          <DottedLine
            label={
              item ? (
                <ItemHover item={item} type={drop.type} rarity={drop.rarity} itemKey={drop.key}>
                  <Flex sx={{ width: 24, height: 24, flexShrink: 0, justifyContent: "center" }}>
                    {asset && (
                      <SpriteFace asset={asset} tint={item.tint} size={24} pixelScale={1} />
                    )}
                  </Flex>
                  {/* The name, not the sprite, is what the dots line up with */}
                  <Text
                    sx={{
                      alignSelf: "baseline",
                      color: CARD_COLORS[drop.rarity] ?? CARD_COLORS.common,
                      fontWeight: 600,
                    }}
                  >
                    {item.name ?? drop.key}
                  </Text>
                </ItemHover>
              ) : (
                <Text>{drop.key}</Text>
              )
            }
            value={
              <Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>1 in {drop.chance}</Text>
            }
          />
        </Flex>
      );
    })}
  </Box>
);
