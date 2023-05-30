import { useState } from "react";
import { Modal, Flex, useAppContext, Slot, Box, Input, Icon, Text, KeyboardButton } from "./";

const ModalDropAmount = () => {
  const { socket, dropItem, setDropItem } = useAppContext();
  const { amount: defaultAmount, location, slotKey, bagId, action, ...item } = dropItem ?? {};
  const [amount, setAmount] = useState(defaultAmount);
  const isShop = action?.includes("SHOP");
  const isConfirm = action?.includes("CONFIRM");
  return (
    <Modal>
      <Modal.Body sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Box>
          <Slot item={{ ...item, id: item?.id + "modal" }} disabled={true} />
        </Box>
        {isConfirm ? (
          <Box>Are you sure?</Box>
        ) : (
          <Flex sx={{ flex: 1, minWidth: 100, flexDirection: "column", gap: 2 }}>
            <Flex sx={{ gap: 2, alignItems: "center" }}>
              <Text>x</Text>
              <Input
                max={defaultAmount}
                min={0}
                autoFocus={true}
                type="number"
                pattern="\d*"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                }}
              />
            </Flex>
          </Flex>
        )}
      </Modal.Body>
      <Modal.Footer>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => setDropItem(null)} keyboardKey="ESCAPE">
          Cancel
        </KeyboardButton>
        <KeyboardButton
          sx={{ flex: 1 }}
          keyboardKey="ENTER"
          onClick={() => {
            if (isShop) {
              socket.emit("moveItem", {
                to: {
                  location: "shop",
                },
                from: { slot: slotKey, bagId, location, amount },
              });
              // so that we can play the sell sound
              if (location !== "shop") {
                window.dispatchEvent(
                  new CustomEvent("ITEM_SELL", {
                    detail: item,
                  })
                );
              }
            } else {
              socket.emit("dropItem", { item, location, bagId, amount });
            }
            setDropItem(null);
          }}
        >
          {isShop ? (
            <Flex sx={{ gap: 1, flex: 1, justifyContent: "center" }}>
              <Icon icon="../assets/icons/gold.png" size={16} sx={{ flexShrink: 0 }} />
              <Text>{amount * item?.cost}</Text>
            </Flex>
          ) : (
            <Text>Drop</Text>
          )}
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDropAmount;
