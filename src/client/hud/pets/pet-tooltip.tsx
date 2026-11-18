import { actors, isActorId, type ActorDefinition } from "@/content";
import type { PetSlot, SavedPet } from "@/rules/capture";
import { formatStats, npcStats } from "@/rules/stats";
import {
  ActorSprite,
  Flex,
  SectionTitle,
  StatGrid,
  StatRows,
  Text,
  Tooltip,
  TooltipContent,
  TYPE,
} from "@/ui";

/** The stats a pet's tooltip lists, in order: what matters in a fight. */
const SHOWN_STATS = [
  "maxHp",
  "minDamage",
  "maxDamage",
  "defense",
  "attackDelay",
  "walkSpeed",
  "critChance",
  "dodgeChance",
] as const;

/** A pet's HP now and its max. */
export interface PetHealth {
  hp: number;
  maxHp: number;
}

/**
 * A pet's stats as tooltip rows: as it comes out, before any buffs. With its `health`, its max HP
 * row reads as HP now over max.
 */
function statLines(actor: ActorDefinition, health?: PetHealth) {
  const stats = npcStats(actor);
  const shown = Object.fromEntries(
    SHOWN_STATS.filter((key) => stats[key] !== undefined).map((key) => [key, stats[key]]),
  );
  return Object.entries(formatStats(shown)).map(([label, value]) =>
    label === "maxHp" && health
      ? { label: "hp", value: `${Math.round(health.hp)} / ${Math.round(health.maxHp)}` }
      : { label, value: Array.isArray(value) ? value.join(" ↔ ") : String(value) },
  );
}

/** A pet slot's tooltip, styled as an item's: its art, name and level, then its stats. */
export const PetTooltip = ({
  tooltipId,
  slot,
  pet,
  health,
}: {
  tooltipId: string;
  slot: PetSlot;
  pet: SavedPet;
  health?: PetHealth;
}) => {
  const actor = isActorId(pet.name) ? (actors[pet.name] as ActorDefinition) : undefined;
  if (!actor) return null;
  return (
    <Tooltip id={tooltipId}>
      <TooltipContent sx={{ px: 2, py: "6px", minWidth: 150 }}>
        <Flex sx={{ alignItems: "center", gap: 2, width: "100%" }}>
          <ActorSprite name={pet.name} size={32} />
          <Flex sx={{ flexDirection: "column", alignItems: "flex-start" }}>
            <Text sx={TYPE.name}>
              {actor.profile.userName}
              <Text sx={{ ...TYPE.meta, ml: 1, color: "gray.400" }}>
                Lv. {actor.baseStats.level ?? 1}
              </Text>
            </Text>
            <Text sx={{ ...TYPE.meta, color: "gray.400" }}>
              {slot === "active" ? "Active pet" : "Stored pet"}
            </Text>
          </Flex>
        </Flex>
        <SectionTitle>Stats</SectionTitle>
        <StatGrid>
          <StatRows lines={statLines(actor, health)} />
        </StatGrid>
      </TooltipContent>
    </Tooltip>
  );
};
