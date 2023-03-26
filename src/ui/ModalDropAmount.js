import React, { useState } from "react";
import { Modal, Button, useAppContext, Slot, Box, Input } from "./";

const ModalDropAmount = () => {
  const { socket, dropItem, setDropItem } = useAppContext();
  const { amount: defaultAmount, location, ...item } = dropItem ?? {};
  const [amount, setAmount] = useState(defaultAmount);
  return (
    <Modal>
      <Modal.Body sx={{ display: "flex", gap: 2 }}>
        <Box>
          <Slot item={item} disabled={true} />
        </Box>
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
      </Modal.Body>
      <Modal.Footer>
        <Button sx={{ flex: 1 }} variant="wood" onClick={() => setDropItem(null)}>
          Cancel
        </Button>
        <Button
          variant="wood"
          sx={{ flex: 1 }}
          onClick={() => {
            socket.emit("dropItem", { item, location, amount });
            setDropItem(null);
          }}
        >
          Drop
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDropAmount;
