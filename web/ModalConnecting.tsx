import { Modal, Icon } from "@aether/ui";
import { useQuery } from "react-query";
import { fetchMetrics } from "./api";
import { useEffect } from "react";

export const ModalConnecting: React.FC = () => {
  const { data: metrics } = useQuery("metrics", fetchMetrics);

  useEffect(() => {
    if (metrics) {
      window.location.href = process.env.SERVER_URL;
    }
  }, [metrics]);

  return (
    <>
      <Modal.Overlay />
      <Modal sx={{ maxWidth: 300 }}>
        <Modal.Header sx={{ paddingLeft: 34 }}>
          <Icon
            icon={"./assets/icons/danger.png"}
            size={42}
            sx={{ position: "absolute", left: 0 }}
          />
          Spinning up
        </Modal.Header>
        <Modal.Body>
          I'm on the free tier, so please be patient while the application spins up.
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ModalConnecting;
