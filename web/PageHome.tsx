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
          sx={{ px: 4, py: 2 }}
        >
          Play Now
        </Button>
        <Button
          as={Link}
          href="https://discord.gg/yadDyqpb6D"
          target="_blank"
          variant="wood"
          sx={{ px: 4, py: 2 }}
        >
          Join Discord
        </Button>
      </Flex>
      <Link href={process.env.SERVER_URL}>
        <Box
          as="img"
          //@ts-ignore
          src="./assets/screenshots/1.png"
          sx={{ maxWidth: "1440px", borderRadius: 20, border: `1px solid #000` }}
        />
      </Link>
    </Flex>
  );
}
