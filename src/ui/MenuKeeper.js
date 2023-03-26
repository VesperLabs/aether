import React, { useState, useEffect } from "react";
import { isMobile } from "../utils";
import { Flex, Text, useAppContext, Portrait, Box, Button, Slot, KeyboardKey } from "./";

const MenuKeeper = () => {
  const { keeper, tabKeeper: show, setTabKeeper } = useAppContext();
  const [tab, setTab] = useState("greet");
  const { dialogues, shop } = keeper?.keeperData ?? {};

  const tabShop = tab === "shop";
  const tabQuests = tab === "quests";
  const tabGreet = tab === "greet";

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
            minWidth: 300,
          }}
        >
          <Flex sx={{ bg: "shadow.30", flexDirection: "column", p: 2, gap: 2, borderRadius: 6 }}>
            <Text dangerouslySetInnerHTML={{ __html: dialogues?.[tab] }} />
            {show && (
              <Flex sx={{ gap: 2 }}>
                <KeeperButton keyboardKey="G" onClick={() => setTab("greet")} active={tabGreet}>
                  Greet
                </KeeperButton>
                <KeeperButton keyboardKey="S" onClick={() => setTab("shop")} active={tabShop}>
                  Shop
                </KeeperButton>
                <KeeperButton keyboardKey="Q" onClick={() => setTab("quests")} active={tabQuests}>
                  Quests
                </KeeperButton>
                <KeeperButton keyboardKey="C" onClick={() => setTabKeeper(false)} active={true}>
                  Close
                </KeeperButton>
              </Flex>
            )}
          </Flex>
        </Flex>
        <Flex
          sx={{
            gap: 2,
            display: tabShop ? "flex" : "none",
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

const KeeperButton = ({ keyboardKey, onClick, children, active, ...props }) => {
  return (
    <Button
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "end",
      }}
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
