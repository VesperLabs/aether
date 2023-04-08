import { ThemeUIStyleObject } from "theme-ui";
import { Flex, Text, useAppContext, Slot, Icon, MenuHeader, Grid } from "./";

const COLUMN_STYLES: ThemeUIStyleObject = {
  gap: 1,
  width: "auto",
  flex: 1,
  gridTemplateColumns: "2fr 1fr",
  textAlign: "right",
  alignItems: "center",
  whiteSpace: "nowrap",
  fontSize: [0, 2, 2],
  "& > *": {
    py: 1,
  },
  "& > :nth-child(odd)": {
    pr: 1,
  },
  "& > :nth-child(even)": {
    px: 2,
    fontSize: [0, 1, 2],
    background: "shadow.20",
    borderRadius: 6,
  },
};

const MenuStats = () => {
  const { hero, tabStats, setTabStats } = useAppContext();
  const { stats } = hero ?? {};
  return (
    <Flex
      sx={{
        flexDirection: "column",
        gap: 2,
        p: 2,
        bg: "shadow.30",
        pointerEvents: "all",
        display: tabStats ? "flex" : "none",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader onClick={() => setTabStats(false)}>Stats</MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", width: 592 }}>
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
            <Text>Spell Damage</Text>
            <Text>{stats?.spellDamage}</Text>
          </Grid>
          <Grid sx={COLUMN_STYLES}>
            <Text>Crit Chance</Text>
            <Text>{stats?.critChance}%</Text>
            <Text>Crit Multiplier</Text>
            <Text>{stats?.critMultiplier}x</Text>
            <Text>Armor Pierce</Text>
            <Text>{stats?.armorPierce}</Text>
            <Text>Walk Speed</Text>
            <Text>{stats?.speed}</Text>
            <Text>Cast Speed</Text>
            <Text>{stats?.castDelay}</Text>
            <Text>Attack Delay</Text>
            <Text>{stats?.attackDelay}</Text>
          </Grid>
          <Grid sx={COLUMN_STYLES}>
            <Text>Dodge Chance</Text>
            <Text>{stats?.dodgeChance}%</Text>
            <Text>Block Chance</Text>
            <Text>{stats?.blockChance}%</Text>
            <Text>Defense</Text>
            <Text>{stats?.defense}</Text>
            <Text>Regen Hp</Text>
            <Text>+{stats?.regenHp}</Text>
            <Text>Regen Mp</Text>
            <Text>+{stats?.regenMp}</Text>
            <Text>Magic Find</Text>
            <Text>{stats?.magicFind}%</Text>
          </Grid>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default MenuStats;
