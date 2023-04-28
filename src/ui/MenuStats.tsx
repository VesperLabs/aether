import { ThemeUIStyleObject } from "theme-ui";
import { Menu, Flex, Text, useAppContext, MenuHeader, Grid } from "./";

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
  "& > :nth-of-type(odd)": {
    pr: 1,
  },
  "& > :nth-of-type(even)": {
    px: 2,
    fontSize: [0, 1, 2],
    background: "shadow.20",
    borderRadius: 6,
  },
};

const MenuStats = () => {
  const { hero, tabStats, setTabStats } = useAppContext();
  const { stats } = hero ?? {};
  if (!stats) return null;
  return (
    <Menu
      sx={{
        display: tabStats ? "flex" : "none",
      }}
    >
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="stats" onClick={() => setTabStats(false)}>
          Stats
        </MenuHeader>
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
            <Text>
              {stats?.minSpellDamage} - {stats?.maxSpellDamage}
            </Text>
          </Grid>
          <Grid sx={COLUMN_STYLES}>
            <Text>Crit Chance</Text>
            <Text>{stats?.critChance?.toFixed(1)}%</Text>
            <Text>Crit Multiplier</Text>
            <Text>{stats?.critMultiplier?.toFixed(1)}x</Text>
            <Text>Armor Pierce</Text>
            <Text>{stats?.armorPierce}</Text>
            <Text>Walk Speed</Text>
            <Text>{Math.round(stats?.speed)}</Text>
            <Text>Cast Delay</Text>
            <Text>{stats?.castDelay}</Text>
            <Text>Attack Delay</Text>
            <Text>{stats?.attackDelay}</Text>
          </Grid>
          <Grid sx={COLUMN_STYLES}>
            <Text>Dodge Chance</Text>
            <Text>{stats?.dodgeChance?.toFixed(1)}%</Text>
            <Text>Block Chance</Text>
            <Text>{stats?.blockChance?.toFixed(1)}%</Text>
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
    </Menu>
  );
};

export default MenuStats;
