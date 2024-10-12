import { Box, Text, Avatar, Center } from '@chakra-ui/react';

const PlayerCircle = ({ players, currentTurnPlayer }) => {
  const radius = 150; // Radius of the circle
  const iconRadius = 40; // Radius of the player icons

    
  // Function to calculate player positions in a circular manner
  const getPlayerPosition = (index, totalPlayers) => {
    const angle = (2 * Math.PI * index) / totalPlayers; // Calculate angle for each player
    const x = radius * Math.cos(angle); // Calculate x position
    const y = radius * Math.sin(angle); // Calculate y position
    return { x, y };
  };

  return (
    <Center position="relative" height="400px" width="400px">
      {/* Outer Square behind the Central Circle */}
      <Box
        height="400px"
        width="450px"
        backgroundColor="gray.300"
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        borderRadius="10px"  // Square shape
      />

      {/* Central Circle */}
      <Box
        height="150px"
        width="150px"
        backgroundColor="teal.500"
        borderRadius="full"
        display="flex"
        justifyContent="center"
        alignItems="center"
        position="absolute"
      >
        <Text color="white">{currentTurnPlayer}'s turn</Text>
      </Box>
      
      {/* Player icons around the central circle */}
      {players.map((player, index) => {
        const { x, y } = getPlayerPosition(index, players.length);

        return (
          <Box
            key={player.username}
            position="absolute"
            transform={`translate(${x}px, ${y}px)`} // Move players around the circle
            textAlign="center"
          >
            {/* Avatar with glow for current player */}
            <Avatar
              size="md"
              name={player.username}
              src={player.avatar || ''} // Use default avatar or player avatar
              border={currentTurnPlayer === player.username ? '3px solid gold' : ''}
              boxShadow={currentTurnPlayer === player.username ? '0 0 15px yellow' : ''}
            />
            <Text mt={2}>{player.username}</Text>
          </Box>
        );
      })}
    </Center>
  );
};

export default PlayerCircle;
