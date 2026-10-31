import { itemList, type ItemDefinition } from "@/content";
import { Flex, Icon, Input, Text } from "@/ui";
import { useMemo, useState } from "react";
import { CARD_COLORS } from "./card-pool";
import { ItemCard, type WikiItem } from "./item-card";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";
import { RowTitle, resolveTypeIcon } from "./row-title";

const listedItems = itemList as unknown as Record<
  string,
  Record<string, Record<string, ItemDefinition>>
>;

const RARITIES = ["common", "magic", "rare", "unique", "set"];
const TYPES = Object.keys(listedItems);

/** Every item, by type, then rarity, then item level. */
const ITEMS: WikiItem[] = TYPES.flatMap((type) =>
  RARITIES.flatMap((rarity) =>
    Object.entries(listedItems[type]?.[rarity] ?? {})
      .map(([key, item]) => ({ ...item, key, type, rarity }))
      .sort((a, b) => a.ilvl - b.ilvl),
  ),
);

export function PageItems() {
  const [type, setType] = useState<string>();
  const [rarity, setRarity] = useState<string>();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ITEMS.filter(
      (item) =>
        (!type || item.type === type) &&
        (!rarity || item.rarity === rarity) &&
        (!query || `${item.name} ${item.flavor ?? ""}`.toLowerCase().includes(query)),
    );
  }, [type, rarity, search]);

  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"chest"}>
        {shown.length} {shown.length === 1 ? "item" : "items"}
        {/* Search, on the right of the title. */}
        <Flex
          sx={{
            ml: "auto",
            height: 28,
            fontWeight: "body",
            textTransform: "none",
            gap: 2,
            alignItems: "stretch",
          }}
        >
          <Input
            placeholder="Search items…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{
              width: [160, 320],
              height: "100%",
              px: 2,
              py: 0,
              fontSize: 1,
            }}
          />
        </Flex>
      </RowTitle>
      {/* Filters on a parchment strip: types on the left, rarities on the right. */}
      <Flex
        sx={{
          ...PAPER_STYLE,
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
          px: 4,
          py: 3,
          mt: 2,
        }}
      >
        <PaperFrame simple />
        <Filter active={!type} onClick={() => setType(undefined)} icon="./assets/icons/bag.png">
          All
        </Filter>
        {TYPES.map((name) => (
          <Filter
            key={name}
            active={type === name}
            onClick={() => setType(type === name ? undefined : name)}
            icon={resolveTypeIcon(name)}
          >
            {name}
          </Filter>
        ))}
        <Flex sx={{ ml: "auto", flexWrap: "wrap", gap: 1 }}>
          {RARITIES.map((name) => (
            <Filter
              key={name}
              active={rarity === name}
              onClick={() => setRarity(rarity === name ? undefined : name)}
              color={CARD_COLORS[name]}
            >
              {name}
            </Filter>
          ))}
        </Flex>
      </Flex>
      <Flex sx={{ flexDirection: "column", gap: 2 }}>
        {shown.map((item) => (
          <ItemCard key={`${item.type}-${item.rarity}-${item.key}`} item={item} />
        ))}
      </Flex>
    </Flex>
  );
}

/** A filter: an icon and label, muted until it's on, then on a slightly darker patch of parchment. */
const Filter = ({
  active,
  onClick,
  icon,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: string;
  color?: string;
  children: string;
}) => (
  <Flex
    as="button"
    onClick={onClick}
    title={children}
    sx={{
      alignItems: "center",
      gap: 1,
      height: 36,
      px: 1,
      py: 0,
      bg: active ? "rgba(74, 56, 38, .1)" : "transparent",
      border: "none",
      borderRadius: 2,
      color: color ?? PAPER.ink,
      font: "inherit",
      fontSize: 1,
      fontWeight: 600,
      textTransform: "capitalize",
      cursor: "pointer",
      opacity: active ? 1 : 0.65,
      "& .icon": { filter: active ? "none" : "grayscale(1)" },
      "&:hover": { opacity: 1 },
    }}
  >
    {icon && <Icon icon={icon} size={32} />}
    <Text sx={{ display: icon ? ["none", "none", "block"] : "block" }}>{children}</Text>
  </Flex>
);
