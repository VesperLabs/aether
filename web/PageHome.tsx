import { Text, Button, Flex, Link, Box } from "@aether/ui";
import RowTitle from "./RowTitle";

export default function () {
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"pen"}>Welcome</RowTitle>
      <Text sx={{ m: 2 }}>
        Welcome to Aether MMO. The game is under active development, but feel free to look around.
      </Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        <Button
          as={Link}
          href={process.env.SERVER_URL}
          target="_blank"
          variant="wood"
          sx={{ px: 3, py: 1, display: "flex", gap: 2, alignItems: "center" }}
        >
          <Text sx={{ fontSize: 5 }}>🎮</Text>
          <Text>Launch Game</Text>
        </Button>
        <Button
          as={Link}
          href="https://discord.gg/yadDyqpb6D"
          target="_blank"
          variant="wood"
          sx={{ px: 3, py: 1, display: "flex", gap: 2, alignItems: "center" }}
        >
          <Text sx={{ fontSize: 5, textShadow: "none" }}>👾</Text>
          <Text>Join Discord</Text>
        </Button>
      </Flex>
      <Link href={process.env.SERVER_URL}>
        <Box
          as="img"
          //@ts-ignore
          src="./assets/screenshots/1.png"
          sx={{
            display: "block",
            maxWidth: "1440px",
            width: "100%",
            borderRadius: 20,
            border: `1px solid #000`,
            overflow: "hidden",
            mt: 2,
            backgroundColor: "shadow.20",
            aspectRatio: "16 / 9",
          }}
        />
      </Link>
    </Flex>
  );
}
