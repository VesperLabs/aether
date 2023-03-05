import React, { useEffect, useState } from "react";
function App({ socket, debug }) {
  return <div>{debug && <DebugPanel socket={socket} debug={debug} />}</div>;
}

const DebugPanel = ({ socket, debug }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
    });
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 100,
        bg: "rgba(0,0,0,.25)",
        color: "#FFF",
        padding: 10,
      }}
    >
      <div>Debug</div>
      <div>{isConnected ? "Connected" : "Disconnected"}</div>
    </div>
  );
};

export default App;
