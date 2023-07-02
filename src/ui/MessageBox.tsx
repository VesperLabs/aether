import React, { useState, useEffect } from "react";
import { Flex, Text, useAppContext } from "./";
import { motion } from "framer-motion";

type MessageProps = {
  data: Message;
};

const MESSAGE_SHOW_TIME = 3000;
const MessageBox = () => {
  const { messages, tabChat } = useAppContext();
  const [show, setShow] = useState<boolean>(true);

  /* Trigger and debounce showing when we get a new message or when they open the box */
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!tabChat) {
      timeout = setTimeout(() => {
        setShow(false);
      }, MESSAGE_SHOW_TIME); // adjust the delay time as needed
    }
    setShow(true);

    return () => clearTimeout(timeout);
  }, [tabChat, messages]);

  return (
    <Flex
      sx={{
        flex: 1,
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <Flex
        as={motion.div}
        //@ts-ignore
        animate={{
          opacity: show ? 1 : 0,
        }}
        sx={{
          flex: 1,
          m: 2,
          minHeight: "300px",
          maxHeight: "300px",
          flexDirection: "column",
          justifyContent: "end",
          maskImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1))`,
          borderRadius: 3,
        }}
      >
        {messages?.map((message: Message, idx: integer) => {
          return <Message key={idx} data={message} />;
        })}
      </Flex>
    </Flex>
  );
};

const getFrom = (data) => {
  if (data?.type === "party") {
    return "Party";
  }
  return data?.from ?? "Server";
};

const Message: React.FC<MessageProps> = ({ data }) => {
  const { message, type } = data ?? {};
  const colorsMap: Record<string, string> = {
    party: "rare",
    chat: "white",
    success: "set",
    error: "danger",
    info: "magic",
  };

  const color: string = colorsMap?.[type] || "white";
  return (
    <Flex sx={{ color, gap: 1, flexGrow: 0 }}>
      <Text sx={{ flexShrink: 0 }}>{getFrom(data)}:</Text>
      <Text sx={{ flex: 1 }}>{message}</Text>
    </Flex>
  );
};

export default MessageBox;
