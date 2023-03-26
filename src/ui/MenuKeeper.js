import React, { useState, useEffect } from "react";
import { Flex, Text, useAppContext, Portrait, Box, Button, Slot } from "./";

const MenuKeeper = () => {
  const { keeper, tabKeeper: show, setTabKeeper } = useAppContext();
  const [tab, setTab] = useState("greet");
  const { dialogues, shop } = keeper?.keeperData ?? {};

  const isShop = tab === "shop";

  useEffect(() => {
    if (!show) setTab("greet");
  }, [show]);

  return (
    <Flex
      className="menu-keeper"
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
            minWidth: 200,
          }}
        >
          <Box sx={{ bg: "shadow.30", p: 3, borderRadius: 6 }}>
            <Text dangerouslySetInnerHTML={{ __html: dialogues?.[tab] }} />
          </Box>
          <Flex sx={{ gap: 1, ml: 2, mt: "-12px" }}>
            <Button variant="wood" onClick={() => setTab("greet")}>
              Greet
            </Button>
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
        <Flex
          sx={{
            gap: 2,
            display: isShop ? "flex" : "none",
            justifySelf: "start",
          }}
        >
          {shop?.map(({ item }, idx) => {
            return (
              <Slot location="shop" slotKey={idx} icon="./assets/icons/chest.png" item={item} />
            );
          })}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default MenuKeeper;
