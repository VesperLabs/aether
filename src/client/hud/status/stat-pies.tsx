import { Box, resourceHex, theme } from "@/ui";

/** A pie's size, and the space between pies, in px: negative, so their black edges overlap. */
const PIE_SIZE = 12;
const PIE_GAP = -1;
/** How far the pies hang below the ring: half a pie. Room a plate leaves under its portrait. */
export const PIES_OVERHANG = PIE_SIZE / 2;

export interface StatPie {
  /** Filled share, 0 to 1. */
  value: number;
  color: string;
  tooltip: string;
}

/** A stat's filled share, safe for a missing or zero max. */
const share = (value?: number, max?: number) =>
  max && max > 0 ? Math.max(0, Math.min(1, (value ?? 0) / max)) : 0;

/** The pies a small plate shows for its HP, MP and SP: their colors and tooltips. */
export const statPie = {
  hp: (hp?: number, maxHp?: number): StatPie => ({
    value: share(hp, maxHp),
    color: theme.colors.red[700],
    tooltip: `HP: ${hp} / ${maxHp}`,
  }),
  mp: (mp?: number, maxMp?: number): StatPie => ({
    value: share(mp, maxMp),
    color: resourceHex("mp"),
    tooltip: `MP: ${mp} / ${maxMp}`,
  }),
  sp: (sp?: number, maxSp?: number): StatPie => ({
    value: share(sp, maxSp),
    color: resourceHex("sp"),
    tooltip: `SP: ${sp} / ${maxSp}`,
  }),
};

/**
 * Little pies in a row across the bottom of a portrait ring of `ringSize` px, centred and sitting
 * half over its edge, in place of a small plate's bars: each a black disc ringed like the portrait,
 * filled clockwise from the top by its stat's share.
 */
export const StatPies = ({ pies, ringSize }: { pies: StatPie[]; ringSize: number }) => {
  const row = pies.length * PIE_SIZE + (pies.length - 1) * PIE_GAP;
  const left = (ringSize - row) / 2;
  const y = ringSize - PIE_SIZE / 2;
  return (
    <>
      {pies.map((pie, i) => {
        const x = left + i * (PIE_SIZE + PIE_GAP);
        const degrees = pie.value * 360;
        return (
          <Box
            key={pie.tooltip.split(":")[0]}
            data-tooltip-id="hud"
            data-tooltip-content={pie.tooltip}
            sx={{
              position: "absolute",
              left: `${Math.round(x)}px`,
              top: `${Math.round(y)}px`,
              width: PIE_SIZE,
              height: PIE_SIZE,
              borderRadius: "50%",
              /* As the portrait's ring: black outside, white just inside */
              border: "1px solid #000",
              boxShadow: "inset 0 0 0 1px #FFF",
              background: `conic-gradient(${pie.color} ${degrees}deg, #000 ${degrees}deg)`,
              pointerEvents: "all",
            }}
          />
        );
      })}
    </>
  );
};
