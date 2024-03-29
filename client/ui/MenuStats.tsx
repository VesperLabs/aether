import { ThemeUIStyleObject } from "theme-ui";
import { Flex, Text, Grid } from "@aether/ui";
import { Menu, MenuHeader, MENU_MAX_WIDTH } from "./";
import { arePropsEqualWithKeys, convertMsToS } from "@aether/shared";
import { memo } from "react";

const COLUMN_STYLES: ThemeUIStyleObject = {
  gap: 1,
  width: "auto",
  flex: 1,
  gridTemplateColumns: "2fr 1.5fr",
  textAlign: "right",
  alignItems: "center",
  whiteSpace: "nowrap",
  fontSize: [0, 1, 2],
  "& > *": {
    py: 1,
  },
  "& > :nth-of-type(odd)": {
    pr: 1,
    fontSize: [0, 1, 1],
  },
  "& > :nth-of-type(even)": {
    px: 2,
    background: "shadow.20",
    borderRadius: 6,
  },
};

const MenuStats = memo(({ player, isOpen, setIsOpen }: any) => {
  const { stats } = player ?? {};
  if (!stats) return null;
  return (
    <Menu
      sx={{
        display: isOpen ? "flex" : "none",
      }}
    >
      <MenuHeader icon={`./assets/icons/stats.png`} onClick={() => setIsOpen(false)}>
        Stats
      </MenuHeader>
      <Flex sx={{ gap: 3, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
        <Grid sx={COLUMN_STYLES}>
          <Text>Strength</Text>
          <Text>{stats?.strength}</Text>
          <Text>Dexterity</Text>
          <Text>{stats?.dexterity}</Text>
          <Text>Intelligence</Text>
          <Text>{stats?.intelligence}</Text>
          <Text>Vitality</Text>
          <Text>{stats?.vitality}</Text>
          <Text>Damage</Text>
          <Text>
            {stats?.minDamage} - {stats?.maxDamage}
          </Text>
          <Text>Fire Damage</Text>
          <Text>
            {stats?.minFireDamage} - {stats?.maxFireDamage}
          </Text>
          <Text>Water Damage</Text>
          <Text>
            {stats?.minWaterDamage} - {stats?.maxWaterDamage}
          </Text>
          <Text>Light Damage</Text>
          <Text>
            {stats?.minLightDamage} - {stats?.maxLightDamage}
          </Text>
          <Text>Earth Damage</Text>
          <Text>
            {stats?.minEarthDamage} - {stats?.maxEarthDamage}
          </Text>
        </Grid>
        <Grid sx={COLUMN_STYLES}>
          <Text>Spell Power</Text>
          <Text>{stats?.spellPower}</Text>
          <Text>Crit Chance</Text>
          <Text>{stats?.critChance?.toFixed(1)}%</Text>
          <Text>Crit Multiplier</Text>
          <Text>{stats?.critMultiplier?.toFixed(1)}x</Text>
          <Text>Armor Pierce</Text>
          <Text>{stats?.armorPierce}</Text>
          <Text>Accuracy</Text>
          <Text>{stats?.accuracy}</Text>
          <Text>Cast Delay</Text>
          <Text>{convertMsToS(stats?.castDelay)}</Text>
          <Text>Attack Delay</Text>
          <Text>{convertMsToS(stats?.attackDelay)}</Text>
          <Text>Walk Speed</Text>
          <Text>{Math.round(stats?.walkSpeed)}</Text>
          <Text>Magic Find</Text>
          <Text>{stats?.magicFind}%</Text>
        </Grid>
        <Grid sx={COLUMN_STYLES}>
          <Text>Regen Hp</Text>
          <Text>+{stats?.regenHp}</Text>
          <Text>Regen Mp</Text>
          <Text>+{stats?.regenMp}</Text>
          <Text>Regen Sp</Text>
          <Text>+{stats?.regenSp}</Text>
          <Text>Fire Resistance</Text>
          <Text>{stats?.fireResistance?.toFixed(0)}%</Text>
          <Text>Light Resistance</Text>
          <Text>{stats?.lightResistance?.toFixed(0)}%</Text>
          <Text>Water Resistance</Text>
          <Text>{stats?.waterResistance?.toFixed(0)}%</Text>
          <Text>Earth Resistance</Text>
          <Text>{stats?.earthResistance?.toFixed(0)}%</Text>
          <Text>Dodge Chance</Text>
          <Text>{stats?.dodgeChance?.toFixed(1)}%</Text>
          <Text>Block Chance</Text>
          <Text>{stats?.blockChance?.toFixed(1)}%</Text>
          <Text>Defense</Text>
          <Text>{stats?.defense}</Text>
        </Grid>
      </Flex>
    </Menu>
  );
}, arePropsEqualWithKeys(["isOpen", "player.stats"]));

export default MenuStats;
