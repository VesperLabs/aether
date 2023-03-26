import React, { useState, useEffect } from "react";
import { isMobile } from "../utils";
import { Flex, Text, useAppContext, Portrait, Box, Button, Slot, KeyboardKey } from "./";

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
          {show && (
            <Flex sx={{ gap: 2, ml: 2, mt: "-12px" }}>
              <KeeperButton keyboardKey="G" onClick={() => setTab("greet")}>
                Greet
              </KeeperButton>
              <KeeperButton keyboardKey="S" onClick={() => setTab("shop")}>
                Shop
              </KeeperButton>
              <KeeperButton keyboardKey="Q" onClick={() => setTab("quests")}>
                Quests
              </KeeperButton>
              <KeeperButton keyboardKey="C" onClick={() => setTabKeeper(false)}>
                Close
              </KeeperButton>
            </Flex>
          )}
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

const KeeperButton = ({ keyboardKey, onClick, children, ...props }) => {
  return (
    <Button
      sx={{ display: "flex", gap: 2, alignItems: "end" }}
      variant="wood"
      onClick={onClick}
      {...props}
    >
      {children}
      {!isMobile && (
        <KeyboardKey sx={{ position: "static", mr: "-2px" }} name={keyboardKey} onKeyUp={onClick} />
      )}
    </Button>
  );
};

export default MenuKeeper;
