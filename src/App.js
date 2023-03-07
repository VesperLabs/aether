import React, { useEffect, useState, createContext, useContext } from "react";
import { isTouchScreen } from "./utils";
import { ThemeProvider, Box, Button, theme, Badge, Flex } from "./ui";

const AppContext = createContext();

const useAppContext = () => {
  return useContext(AppContext);
};

function App({ socket, debug }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <AppContext.Provider value={{ isConnected, setIsConnected, socket, debug }}>
        <GameWrapper>
          <StatusPanel />
          {isTouchScreen && <AttackPad />}
        </GameWrapper>
      </AppContext.Provider>
    </ThemeProvider>
  );
}

const GameWrapper = (props) => {
  return (
    <Box
      sx={{
        inset: "0 0 0 0",
        position: "fixed",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
        {...props}
      />
    </Box>
  );
};

const AttackPad = () => {
  return (
    <Button
      onTouchStart={(e) => {
        window.dispatchEvent(new Event("hero_attack"));
      }}
      sx={{
        width: 100,
        height: 100,
        bottom: 50,
        right: 20,
        borderRadius: "100%",
        position: "absolute",
      }}
    />
  );
};

const StatusPanel = () => {
  const { isConnected } = useAppContext();
  return (
    <Box
      sx={{
        bottom: 0,
        right: 0,
        left: 0,
        position: "fixed",
        bg: "shadow.15",
        pointerEvents: "none",
      }}
    >
      <Flex p={2}>
        {isConnected ? (
          <Badge sx={{ bg: "success" }}>Connected</Badge>
        ) : (
          <Badge sx={{ bg: "danger" }}>Disconnected</Badge>
        )}
      </Flex>
    </Box>
  );
};

export default App;
