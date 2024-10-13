import React, { useRef,useState } from 'react';
import { Box, Button } from '@chakra-ui/react';

const VideoChat = ({ roomId, username }) => {
  const jitsiContainerRef = useRef(null);
  const [isJitsiStarted, setIsJitsiStarted] = useState(false); // Track Jitsi start

  const startJitsi = () => {
    const domain = 'meet.jit.si';
    const options = {
      roomName: roomId,
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: username,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    api.addEventListener('videoConferenceJoined', () => {
      console.log(`${username} has joined the Jitsi meeting in room ${roomId}`);
    });

    api.addEventListener('readyToClose', () => {
      console.log('Jitsi meeting ended.');
    });
    setIsJitsiStarted(true);
  };

  return (
    
    <Box
      position="relative"
      height="400px"  // Fixed height
      width="300px"   // Fixed width
      display="flex"
      flexWrap="wrap"
      bg="rgba(0, 0, 0, 0.8)"  // Dark background for neon effect
      borderRadius="10px"
      justifyContent="center"
      alignItems="center"
      p="10px"
      boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF"  // Neon glow
      transition="0.3s ease"  // Smooth transition
    >
    {!isJitsiStarted && (
      <Button
          onClick={startJitsi}
          mt="20px"
          bg="black"
          color="white"
          border="2px solid #FF00FF"
          boxShadow="0 0 15px #00FFFF, 0 0 20px #FF00FF"
          _hover={{
            boxShadow: '0 0 25px #FF00FF, 0 0 30px #00FFFF',
            transform: 'scale(1.05)',  // Slight scale-up on hover
          }}
        >
          Start Jitsi Meeting
        </Button>
      )}
      <div ref={jitsiContainerRef} style={{ width: '100%', height: '100%' }}></div>

    
    </Box>
  );
};

export default VideoChat;
