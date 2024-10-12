// import React, { useState, useEffect, useRef } from 'react';
// import { Box, VStack, Input, Button, Text } from '@chakra-ui/react';
// import io from 'socket.io-client';
// import "./Chat.css";


// const Chat = ({ socket, roomId , username }) => {
//   const [message, setMessage] = useState('');
//   const [messages, setMessages] = useState([]);
//   const messagesEndRef = useRef(null);


  
//  // Scroll to the latest message when a new message is added
//  const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(scrollToBottom, [messages]);

//   // Listening for messages from other players
//   useEffect(() => {
//     socket.on('receiveMessage', (data) => {
//       setMessages((prevMessages) => [...prevMessages, data]);
//     });

//     return () => {
//         socket.off('receiveMessage');  // Clean up listener on component unmount
//       };

//   }, [socket]);

// const sendMessage = () => {
//   if (message.trim() !== '') {
//     // Send message with roomId and username
//     socket.emit('sendMessage', roomId, message, username, (response) => {
//       if (response.success) {
//         // setMessages((prevMessages) => [...prevMessages, { username: 'You', message }]);
//         setMessage('');
//       } else {
//         console.error(response.message);
//       }
//     });
//     setMessage('');  // Clear input field
//   }
// }

//   return (
//     <Box position="relative" w="300px" h="400px">
//     <Box
//     w="300px"
//         h="400px"
//         bg="blackAlpha.800"
//         position="absolute"
//         top="0"
//         left="0"
//         zIndex="0"
//         borderRadius="md"
//     />
//     <Box
//       w="300px"
//         h="400px"
//         border="1px solid"
//         borderColor="gray.300"
//         borderRadius="md"
//         p={4}
//         display="flex"
//         flexDirection="column"
//         bg="rgba(255, 255, 255, 0.6)"
//         zIndex="1"
//     >
//       <VStack
//         spacing={2}
//         overflowY="auto"
//         flexGrow={1}
//         alignItems="flex-start"
//         mb={2}
//         pr={2}
//         style={{ maxHeight: '350px' }}
//       >
//         {messages.map((msg, index) => (
//           <Text key={index} fontSize="sm" textAlign="left" color="black">
//             <strong>{msg.username}:</strong> {msg.message}
//           </Text>
//         ))}
//         <div ref={messagesEndRef} />
//       </VStack>


//       <Input
//         placeholder="Type your message..."
//         value={message}
//         onChange={(e) => setMessage(e.target.value)}
//         onKeyPress={(e) => {
//           if (e.key === 'Enter') {
//             sendMessage();
//           }
//         }}
//       />
//       <Button mt={2} colorScheme="blue" onClick={sendMessage}>
//         Send
//       </Button>
//     </Box>
//     </Box>
//   );
// };

// export default Chat;

import React, { useState, useEffect, useRef } from 'react';
import { Box, VStack, Input, Button, Text } from '@chakra-ui/react';
import io from 'socket.io-client';
import "./Chat.css";

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
    <Box position="relative" w="300px" h="400px" borderRadius="md" overflow="hidden" boxShadow="lg">
      <Box
        w="100%"
        h="100%"
        bg="rgba(128, 128, 128, 0.5)" // Set transparent gray background
        borderRadius="md"
        display="flex"
        flexDirection="column"
      >
        <VStack
          spacing={2}
          overflowY="auto"
          flexGrow={1}
          alignItems="flex-start"
          p={4} // Add padding for the message container
          borderBottom="1px solid" // Divider between messages and input
          borderColor="gray.300"
        >
          {messages.map((msg, index) => (
            <Text key={index} fontSize="sm" textAlign="left" color="gray.700"> {/* White text for contrast */}
              <strong>{msg.username}:</strong> {msg.message}
            </Text>
          ))}
          <div ref={messagesEndRef} />
        </VStack>

        <Box display="flex" p={2} borderTop="1px solid" borderColor="gray.300"> {/* Container for input and button */}
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
            mr={2} // Margin for spacing
            bg="gray.700" // Dark gray background for the input
            color="white" // White text for input
          />
          <Button colorScheme="blue" onClick={sendMessage} borderRadius="md">
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Chat;
