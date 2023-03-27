import React, { useState } from "react";
import { Modal, Button, useAppContext, Slot, Box, Input } from "./";

const ModalDropAmount = () => {
  const { socket, dropItem, setDropItem } = useAppContext();
  const { amount: defaultAmount, location, slotKey, action, ...item } = dropItem ?? {};
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
          <Input
            autoFocus={true}
            sx={{ flex: 1 }}
            type="number"
            pattern="\d*"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button sx={{ flex: 1 }} variant="wood" onClick={() => setDropItem(null)}>
          Cancel
        </Button>
        <Button
          variant="wood"
          sx={{ flex: 1 }}
          onClick={() => {
            if (isShop) {
              socket.emit("moveItem", {
                to: {
                  location: "shop",
                },
                from: { slot: slotKey, location, amount },
              });
            } else {
              socket.emit("dropItem", { item, location, amount });
            }
            setDropItem(null);
          }}
        >
          {isShop ? "Sell" : "Drop"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDropAmount;
