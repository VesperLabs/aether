import { gearFamilies, ITEM_CATALOG, type CatalogItem } from "@/content";
import { Flex, Input } from "@/ui";
import { useMemo } from "react";
import { useSearchParams } from "wouter";
import { Filter } from "./filter-button";
import { ItemList } from "./item-list";
import { PAPER_STYLE, PaperFrame } from "./paper";
import { RowTitle, resolveTypeIcon } from "./row-title";

const FAMILY_ORDER = Object.keys(gearFamilies);
const RARITY_ORDER = ["common", "rare", "unique", "set"];
const TYPES = [
  ...new Set([...Object.values(gearFamilies).map((family) => family.type), "spell", "stackable"]),
];

/** Where an item sorts: its type, its family (content order), its tier, then its rarity. */
const sortKey = (item: CatalogItem) => [
  TYPES.indexOf(item.type),
  FAMILY_ORDER.includes(item.base) ? FAMILY_ORDER.indexOf(item.base) : FAMILY_ORDER.length,
  item.base,
  item.tier,
  RARITY_ORDER.indexOf(item.rarity),
];

const compare = (a: CatalogItem, b: CatalogItem) => {
  const [x, y] = [sortKey(a), sortKey(b)];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
};

/** Every item, family by family and tier by tier, each tier's uniques and sets after its own. */
const ITEMS = Object.values(ITEM_CATALOG).sort(compare);

export function PageItems() {
  // Filters live in the URL (?type=&q=) so they survive a refresh and can be linked.
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? undefined;
  const search = params.get("q") ?? "";
  const setParam = (key: string, value?: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ITEMS.filter(
      (item) =>
        (!type || item.type === type) &&
        (!query || `${item.name} ${item.base} ${item.flavor ?? ""}`.toLowerCase().includes(query)),
    );
  }, [type, search]);

  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon="chest">
        {shown.length} {shown.length === 1 ? "item" : "items"}
        <Input
          placeholder="Search items…"
          value={search}
          onChange={(event) => setParam("q", event.target.value)}
          sx={{
            ml: "auto",
            width: [160, 320],
            height: 28,
            px: 2,
            py: 0,
            fontSize: 1,
            fontWeight: "body",
            textTransform: "none",
          }}
        />
      </RowTitle>
      <Flex
        sx={{ ...PAPER_STYLE, flexWrap: "wrap", alignItems: "center", gap: 1, px: 4, py: 3, mt: 2 }}
      >
        <PaperFrame simple />
        <Filter active={!type} onClick={() => setParam("type")} icon="./assets/icons/bag.png">
          All
        </Filter>
        {TYPES.map((name) => (
          <Filter
            key={name}
            active={type === name}
            onClick={() => setParam("type", type === name ? undefined : name)}
            icon={resolveTypeIcon(name)}
          >
            {name}
          </Filter>
        ))}
      </Flex>
      <ItemList items={shown} />
    </Flex>
  );
}
