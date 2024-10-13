import React, { useState, useEffect, useRef } from 'react';
import { Box, VStack, Input, Button, Text } from '@chakra-ui/react';
import io from 'socket.io-client';
import "./Chat.css"; // Neon CSS file

const Chat = ({ socket, roomId, username }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to the latest message when a new message is added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Listening for messages from other players
  useEffect(() => {
    socket.on('receiveMessage', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off('receiveMessage');  // Clean up listener on component unmount
    };
  }, [socket]);

  const sendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('sendMessage', roomId, message, username, (response) => {
        if (response.success) {
          setMessage(''); // Clear input field
        } else {
          console.error(response.message);
        }
      });
    }
  };

  return (
    <Box className="neon-chat-container" position="relative" w="300px" h="400px" borderRadius="md" overflow="hidden" boxShadow="lg">
      <Box
        w="100%"
        h="100%"
        className="neon-chat-background"
        borderRadius="md"
        display="flex"
        flexDirection="column"
      >
        <VStack
          spacing={2}
          overflowY="auto"
          flexGrow={1}
          alignItems="flex-start"
          p={4}
          borderBottom="1px solid" // Divider between messages and input
          borderColor="rgba(255, 255, 255, 0.3)"
        >
          {messages.map((msg, index) => (
            <Text key={index} fontSize="sm" className="neon-message-text">
              <strong>{msg.username}:</strong> {msg.message}
            </Text>
          ))}
          <div ref={messagesEndRef} />
        </VStack>

        <Box display="flex" p={2} borderTop="1px solid" borderColor="rgba(255, 255, 255, 0.3)">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
            borderRadius="md"
            mr={2}
            className="neon-input"
          />
          <Button className="neon-button" onClick={sendMessage} borderRadius="md">
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Chat;
