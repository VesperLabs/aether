import { useState } from "react";
import { Modal, Flex, useAppContext, Slot, Box, Input, Icon, Text, KeyboardButton } from "./";

const ModalDropAmount = () => {
  const { socket, dropItem, setDropItem } = useAppContext();
  const {
    amount: defaultAmount,
    location,
    slotKey,
    bagId,
    action,
    dataset,
    ...item
  } = dropItem ?? {};
  const [amount, setAmount] = useState(defaultAmount);
  const isShop = action?.includes("SHOP");
  const isConfirm = action?.includes("CONFIRM");
  const isBuying = action?.includes("BUY");
  const isSelling = action?.includes("SELL");
  const maxAmount = isBuying ? 999 : defaultAmount;

  const handleAction = () => {
    /* Play the shop sound */
    if (isShop && location !== "shop") {
      window.dispatchEvent(
        new CustomEvent("AUDIO_ITEM_SELL", {
          detail: item,
        })
      );
    }
    /* If we are selling to the shop, send the amount */
    if (isShop && isSelling) {
      socket.emit("moveItem", {
        to: {
          location: "shop",
        },
        from: { slot: slotKey, bagId, location, amount },
      });
      /* If we are buying to the shop, send the amount */
    } else if (isShop && isBuying) {
      socket.emit("moveItem", {
        from: {
          location: "shop",
          slot: slotKey,
          amount,
        },
        to: {
          slot: dataset?.slotKey,
          bagId: dataset?.bagId,
          location: dataset?.location,
        },
      });
    } else {
      socket.emit("dropItem", { item, location, bagId, amount: item?.amount });
    }

    setDropItem(null);
  };

  return (
    <Modal>
      <Modal.Header>
        {isConfirm && <Text>Confirm</Text>}
        {isBuying && <Text>Buy</Text>}
        {isSelling && <Text>Sell</Text>}
      </Modal.Header>
      <Modal.Body
        sx={{
          flexDirection: "row",
          gap: 2,
          alignItems: "center",
          justifyContent: "center",
          width: "300px",
        }}
      >
        <Slot item={{ ...item, id: item?.id + "modal" }} disabled={true} />
        {!isConfirm && (
          <Flex sx={{ flex: 1, alignItems: "center", gap: 2, minWidth: 100 }}>
            <Text>x</Text>
            <Input
              max={maxAmount}
              min={1}
              autoFocus={true}
              type="number"
              pattern="\d*"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
            />
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
          onClick={handleAction}
          disabled={amount < 1}
        >
          {isShop ? (
            <>
              <Icon icon="../assets/icons/gold.png" size={16} sx={{ flexShrink: 0 }} />
              <Text>{amount * item?.cost}</Text>
            </>
          ) : (
            <Text>Drop</Text>
          )}
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDropAmount;
