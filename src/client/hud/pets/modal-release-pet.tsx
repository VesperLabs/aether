import { useAppContext } from "@/client/hud/app/context";
import { actors, isActorId, type ActorDefinition } from "@/content";
import type { PetSlot } from "@/rules/capture";
import { ActorSprite, Flex, KeyboardButton, Modal, SLOT_SIZE, STYLE_NON_EMPTY, Text } from "@/ui";

/** Asks before letting the pet in `slot` go for good, as dropping a rare item asks. */
export const ModalReleasePet = ({ slot, onClose }: { slot: PetSlot; onClose: () => void }) => {
  const { socket, zoom, bottomOffset, hero } = useAppContext();
  const pet = hero?.pets?.[slot];
  if (!pet) return null;
  const name = isActorId(pet.name)
    ? (actors[pet.name] as ActorDefinition).profile.userName
    : pet.name;
  const release = () => {
    socket.emit("releasePet", { slot });
    onClose();
  };
  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={onClose} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header icon="./assets/icons/danger.png">Release {name}?</Modal.Header>
        <Modal.Body sx={{ gap: 2, alignItems: "center", minWidth: 300 }}>
          <Flex
            sx={{
              ...STYLE_NON_EMPTY({ rarity: "common" }),
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <ActorSprite name={pet.name} size={SLOT_SIZE} maxScale={1} wholeSteps />
          </Flex>
          <Text sx={{ textAlign: "center", fontSize: 0, opacity: 0.8 }}>
            It goes back to the wild, and is gone for good.
          </Text>
        </Modal.Body>
        <Modal.Footer>
          <KeyboardButton sx={{ flex: 1 }} onClick={onClose} keyboardKey="ESCAPE">
            Cancel
          </KeyboardButton>
          <KeyboardButton sx={{ flex: 1 }} keyboardKey="ENTER" onClick={release}>
            Release
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
