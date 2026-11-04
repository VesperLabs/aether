import { musicCredits } from "@/content";
import { Flex, Text } from "@/ui";

export const MusicCredits = () => (
  <Flex sx={{ flexDirection: "column", gap: 2 }}>
    {musicCredits.map(({ title, author, site, license }) => (
      <Text key={title} sx={{ fontSize: 0, lineHeight: 1.35 }}>
        "{title}" by{" "}
        <a href={site} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
          {author}
        </a>{" "}
        ({license})
      </Text>
    ))}
  </Flex>
);
