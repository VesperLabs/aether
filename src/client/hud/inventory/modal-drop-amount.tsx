import { useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Slot } from "./slot";
import type { BuiltItem } from "@/content";
import type { DropItem } from "@/client/hud/app/context";
import { Modal, Flex, Input, Icon, Text, KeyboardButton } from "@/ui";

export const ModalDropAmount = () => {
  const { socket, dropItem, setDropItem, zoom, bottomOffset, hero } = useAppContext();
  const {
    amount: defaultAmount,
    location,
    slotKey,
    bagId,
    action,
    dataset,
    gear,
    ...item
  } = dropItem as DropItem;
  const [amount, setAmount] = useState<number | string>(defaultAmount);
  const isShop = action?.includes("SHOP");
  const isSocket = action === "SOCKET_CONFIRM";
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
        }),
      );
    }
    /* If we are selling to the shop, send the amount */
    if (isSocket) {
      socket.emit("moveItem", {
        from: { slot: slotKey, bagId, location },
        to: { slot: dataset?.slotKey, bagId: dataset?.bagId, location: dataset?.location },
      });
    } else if (isShop && isSelling) {
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
      socket.emit("dropItem", { item, location, bagId, amount: amount });
    }

    setDropItem(null);
  };

  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={() => setDropItem(null)} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header icon="./assets/icons/pen.png">
          {isSocket
            ? "Confirm Socket?"
            : isBuying
              ? "Buy"
              : isSelling
                ? isConfirm
                  ? "Confirm Sale?"
                  : "Sell"
                : isConfirm
                  ? "Confirm Drop?"
                  : "Drop"}
        </Modal.Header>
        <Modal.Body sx={{ gap: 2, alignItems: "stretch", minWidth: 300 }}>
          <Flex sx={{ gap: 2, alignItems: "center", justifyContent: "center" }}>
            <Slot
              player={hero}
              item={{ ...item, id: item?.id + "modal" } as BuiltItem}
              disabled={true}
            />
            {isSocket && gear && (
              <>
                <Text>→</Text>
                <Slot player={hero} item={{ ...gear, id: gear.id + "modal" }} disabled={true} />
              </>
            )}
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
          </Flex>
          {isSocket && (
            <Text sx={{ textAlign: "center", fontSize: 0, opacity: 0.8 }}>
              The card is used up for good.
            </Text>
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
            disabled={Number(amount) < 1}
          >
            {isShop ? (
              <>
                <Icon icon="./assets/icons/gold.png" size={16} sx={{ flexShrink: 0 }} />
                <Text>{Number(amount) * (item?.cost as number)}</Text>
              </>
            ) : (
              <Text>{isSocket ? "Socket" : "Drop"}</Text>
            )}
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
