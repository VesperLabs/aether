import { Box, Flex } from "@/ui";
import { useSearchParams } from "wouter";
import { ACTORS, GROUPS } from "./actor-parts";
import { CharacterCard, actorArt } from "./character-card";
import { Filter } from "./filter-button";
import { PAPER_STYLE, PaperFrame } from "./paper";
import { RowTitle } from "./row-title";
import { useHashScroll } from "./use-hash-scroll";

/* Built once: new objects each render would make the renderers redraw. */
const CHARACTERS = ACTORS.map(([key, actor]) => ({ key, actor, art: actorArt(actor) }));

const icon = (name: string) => `./assets/icons/${name}.png`;

/** Every actor in the game, narrowed to keepers or mobs. */
export function PageCharacters() {
  useHashScroll();
  // The filter lives in the URL (?group=) so it survives a refresh and can be linked.
  const [params, setParams] = useSearchParams();
  const group = GROUPS.find((g) => g.id === params.get("group"));
  const setGroup = (id?: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("group", id);
        else next.delete("group");
        return next;
      },
      { replace: true },
    );
  const shown = CHARACTERS.filter(({ actor }) => !group || group.has(actor));
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"bounty"}>
        {shown.length} {shown.length === 1 ? "character" : "characters"}
      </RowTitle>
      <Flex
        sx={{ ...PAPER_STYLE, flexWrap: "wrap", alignItems: "center", gap: 1, px: 4, py: 3, mt: 2 }}
      >
        <PaperFrame simple />
        <Filter active={!group} onClick={() => setGroup(undefined)} icon={icon("social")}>
          All
        </Filter>
        {GROUPS.map(({ id, label, icon: name }) => (
          <Filter
            key={id}
            active={group?.id === id}
            onClick={() => setGroup(group?.id === id ? undefined : id)}
            icon={icon(name)}
          >
            {label}
          </Filter>
        ))}
      </Flex>
      {/* Masonry: cards keep their own height and stack down three columns. */}
      <Box sx={{ mt: 2, columnCount: [1, 2, 3], columnGap: 3 }}>
        {shown.map(({ key, actor, art }) => (
          <Box
            key={key}
            id={key}
            sx={{ breakInside: "avoid", mb: 3, display: "inline-block", width: "100%" }}
          >
            <CharacterCard actor={actor} art={art} />
          </Box>
        ))}
      </Box>
    </Flex>
  );
}
