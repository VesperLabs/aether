import { itemList, nasties, resolveAsset, type NastyDefinition } from "@/content";
import { calculateExpValue, npcStats } from "@/rules/stats";
import { Box, Flex, Grid, Icon, Text } from "@/ui";
import { CARD_COLORS, SpriteFace, raceAsset } from "./card-pool";
import { Divider, PAPER, PAPER_STYLE, PaperFrame } from "./paper";
import { RowTitle } from "./row-title";

type ListedItem = { name?: string; texture?: string; slot?: string; tint?: string };
const listedItems = itemList as unknown as Record<
  string,
  Record<string, Record<string, ListedItem>>
>;

/** Green for monsters that won't attack first. */
const PASSIVE_COLOR = "#15803d";

const MONSTERS = Object.entries(nasties as Record<string, NastyDefinition>)
  .map(([key, mob]) => ({ key, mob, stats: npcStats(mob) }))
  .sort((a, b) => (a.stats.level ?? 0) - (b.stats.level ?? 0));

export function PageNasties() {
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"bounty"}>Monsters</RowTitle>
      {/* Masonry: cards keep their own height and stack down three columns. */}
      <Box sx={{ mt: 2, columnCount: [1, 2, 3], columnGap: 3 }}>
        {MONSTERS.map(({ key, mob, stats }) => (
          <Box
            key={key}
            sx={{ breakInside: "avoid", mb: 3, display: "inline-block", width: "100%" }}
          >
            <MonsterCard mob={mob} stats={stats} />
          </Box>
        ))}
      </Box>
    </Flex>
  );
}

const MonsterCard = ({ mob, stats }: { mob: NastyDefinition; stats: Record<string, number> }) => {
  const asset = raceAsset(mob.profile.race);
  return (
    <Box sx={{ ...PAPER_STYLE, p: 4 }}>
      <PaperFrame />
      <Flex sx={{ gap: 3, alignItems: "center" }}>
        <Flex
          sx={{
            width: 64,
            height: 64,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {asset && <SpriteFace asset={asset} tint={mob.profile.tint} size={64} />}
        </Flex>
        <Box sx={{ minWidth: 0 }}>
          <Text as="h3" sx={{ fontSize: 4, fontWeight: 700, m: 0 }}>
            {mob.profile.userName}
          </Text>
          <Text as="p" sx={{ color: CARD_COLORS.monster, fontSize: 1, fontWeight: 600, m: 0 }}>
            Level {stats.level} {mob.charClass}
            {mob.state?.isAggro === false && (
              <Box as="span" sx={{ color: PASSIVE_COLOR }}>
                {" "}
                · passive
              </Box>
            )}
          </Text>
        </Box>
      </Flex>
      <Text
        as="p"
        sx={{ color: PAPER.muted, fontSize: 1, lineHeight: 1.5, m: 0, mt: 2, minHeight: "3em" }}
      >
        {mob.flavor}
      </Text>
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
        <Stat
          label="EXP"
          value={calculateExpValue({ playerLevel: stats.level, mobLevel: stats.level })}
        />
      </Grid>
      {/* Resistances: the element icons speak for themselves. */}
      <Flex sx={{ justifyContent: "space-between", mt: 3, fontSize: 1 }}>
        {ELEMENTS.map((element) => (
          <Flex key={element} title={`${element} resistance`} sx={{ alignItems: "center", gap: 1 }}>
            <Icon
              icon={`./assets/icons/elements/${element}.png`}
              size={24}
              sx={{ flexShrink: 0 }}
            />
            <Text sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              {Math.round(stats[`${element}Resistance`] ?? 0)}%
            </Text>
          </Flex>
        ))}
      </Flex>
      <Divider label="Drops" />
      <Drops drops={mob.drops ?? []} />
    </Box>
  );
};

/** The elements a character can resist, each with its icon in `assets/icons/elements/`. */
const ELEMENTS = ["fire", "water", "earth", "light"];

/** One stat as a label and value joined by a dotted leader, like the drops list. */
const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <Flex sx={{ alignItems: "baseline", gap: 1, minWidth: 0 }}>
    <Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>{label}</Text>
    <Box sx={{ flex: 1, minWidth: 8, borderBottom: `1px dotted ${PAPER.ornament}` }} />
    <Text sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{value}</Text>
  </Flex>
);

/** What the monster drops, each in its rarity colour with its 1-in-N chance. */
const Drops = ({ drops }: { drops: NonNullable<NastyDefinition["drops"]> }) => (
  <Box sx={{ textAlign: "left", fontSize: 1 }}>
    {!drops.length && <Text sx={{ color: PAPER.muted, fontStyle: "italic" }}>Nothing</Text>}
    {drops.map((drop) => {
      const item = listedItems[drop.type]?.[drop.rarity]?.[drop.key];
      const asset = item && resolveAsset(item, { profile: { race: "human", gender: "female" } });
      return (
        <Flex key={`${drop.type}-${drop.key}`} sx={{ alignItems: "center", gap: 2, py: "2px" }}>
          <Flex sx={{ width: 24, height: 24, flexShrink: 0, justifyContent: "center" }}>
            {asset && <SpriteFace asset={asset} tint={item.tint} size={24} pixelScale={1} />}
          </Flex>
          <Text sx={{ color: CARD_COLORS[drop.rarity] ?? CARD_COLORS.common, fontWeight: 600 }}>
            {item?.name ?? drop.key}
          </Text>
          {/* A dotted leader, so each item visibly lines up with its odds. */}
          <Box
            sx={{ flex: 1, minWidth: 16, borderBottom: `1px dotted ${PAPER.ornament}`, mb: "4px" }}
          />
          <Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>1 in {drop.chance}</Text>
        </Flex>
      );
    })}
  </Box>
);
