import type { StatLine, TriggerLine } from "@/rules/inventory";
import { Label, Text, TextDivider } from "@/ui/kit";

/** "label: value" lines, one per stat. */
export const StatLines = ({ lines, color }: { lines: StatLine[]; color?: string }) =>
  lines.map(({ label, value }) => (
    <Text key={label} color={color}>
      <Label>{label}:</Label> {value}
    </Text>
  ));

/** "25% chance on hit: Burn (Lv. 2)" */
export const TriggerLines = ({ triggers, color }: { triggers: TriggerLine[]; color?: string }) =>
  triggers.map((t, idx) => (
    <Text key={idx} color={color}>
      <Label>
        {t.chancePercent}% chance {t.when}:{" "}
      </Label>
      {t.name} <Text sx={{ fontSize: 0, color: "gray.400" }}>(Lv. {t.level})</Text>
    </Text>
  ));

/** A titled block of stat lines; renders nothing when there are none. */
export const StatSection = ({ title, lines }: { title: string; lines: StatLine[] }) =>
  lines.length > 0 && (
    <>
      <TextDivider>{title}</TextDivider>
      <StatLines lines={lines} />
    </>
  );
