import React, { useState, useEffect } from "react";
import { Flex, Text, useAppContext, Portrait, Box, Button } from "./";

const MenuKeeper = () => {
  const { keeper, tabKeeper: show, setTabKeeper } = useAppContext();
  const [tab, setTab] = useState();
  const { dialogues } = keeper?.keeperData ?? {};

  useEffect(() => {
    if (!show) setTab(null);
  }, [show]);

  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.30",
        pointerEvents: "all",
        display: show ? "flex" : "none",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <Text>{keeper?.profile?.userName}</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", width: 592 }}>
        <Portrait user={keeper} />
        <Flex
          sx={{
            gap: 1,
            flexDirection: "column",
            flex: 1,
          }}
        >
          <Box sx={{ bg: "shadow.30", p: 3, borderRadius: 6 }}>
            {!tab && <Text dangerouslySetInnerHTML={{ __html: dialogues?.greet }} />}
            {tab === "shop" && <Text dangerouslySetInnerHTML={{ __html: dialogues?.shop }} />}
            {tab === "quests" && <Text dangerouslySetInnerHTML={{ __html: dialogues?.quests }} />}
          </Box>
          <Flex sx={{ gap: 1, ml: 2, mt: "-14px" }}>
            <Button variant="wood" onClick={() => setTab("shop")}>
              Shop
            </Button>
            <Button variant="wood" onClick={() => setTab("quests")}>
              Quests
            </Button>
            <Button variant="wood" onClick={() => setTabKeeper(false)}>
              Close
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default MenuKeeper;
