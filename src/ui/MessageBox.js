import React, { useState, useEffect } from "react";
import { Flex, Text, Box, useAppContext } from "./";
import { motion } from "framer-motion";

const MESSAGE_SHOW_TIME = 3000;
const MessageBox = () => {
  const { messages, tabChat } = useAppContext();
  const [show, setShow] = useState(true);

  /* Trigger and debounce showing when we get a new message or when they open the box */
  useEffect(() => {
    let timeout;

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
      as={motion.div}
      animate={{
        opacity: show ? 1 : 0,
      }}
      sx={{
        flex: 1,
        m: 2,
        flexDirection: "column",
        justifyContent: "end",
        height: "20vh",
        maskImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1))`,
        borderRadius: 3,
      }}
    >
      {messages?.map((message) => {
        return <Message data={message} />;
      })}
    </Flex>
  );
};

const Message = ({ data }) => {
  const { from, message, type } = data ?? {};
  const colorsMap = {
    chat: "white",
    error: "danger",
    info: "magic",
  };
  const color = colorsMap?.[type] || "white";
  return (
    <Flex sx={{ color, gap: 1, flexGrow: 0 }}>
      <Text sx={{ flexShrink: 0 }}>{from || "Server"}:</Text>
      <Text sx={{ flex: 1 }}>{message}</Text>
    </Flex>
  );
};

export default MessageBox;
