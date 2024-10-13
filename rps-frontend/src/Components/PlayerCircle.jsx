// import { Box, Text, Avatar, Center } from '@chakra-ui/react';

// const PlayerCircle = ({ players, currentTurnPlayer }) => {
//   const radius = 150; // Radius of the circle
//   const iconRadius = 40; // Radius of the player icons

    
//   // Function to calculate player positions in a circular manner
//   const getPlayerPosition = (index, totalPlayers) => {
//     const angle = (2 * Math.PI * index) / totalPlayers; // Calculate angle for each player
//     const x = radius * Math.cos(angle); // Calculate x position
//     const y = radius * Math.sin(angle); // Calculate y position
//     return { x, y };
//   };

//   return (
//     <Center position="relative" height="400px" width="400px">
//       {/* Outer Square behind the Central Circle */}
//       <Box
//         height="400px"
//         width="450px"
//         backgroundColor="gray.300"
//         position="absolute"
//         top="50%"
//         left="50%"
//         transform="translate(-50%, -50%)"
//         display="flex"
//         justifyContent="center"
//         alignItems="center"
//         borderRadius="10px"  // Square shape
//       />

//       {/* Central Circle */}
//       <Box
//         height="150px"
//         width="150px"
//         backgroundColor="teal.500"
//         borderRadius="full"
//         display="flex"
//         justifyContent="center"
//         alignItems="center"
//         position="absolute"
//       >
//         <Text color="white">{currentTurnPlayer}'s turn</Text>
//       </Box>
      
//       {/* Player icons around the central circle */}
//       {players.map((player, index) => {
//         const { x, y } = getPlayerPosition(index, players.length);

//         return (
//           <Box
//             key={player.username}
//             position="absolute"
//             transform={`translate(${x}px, ${y}px)`} // Move players around the circle
//             textAlign="center"
//           >
//             {/* Avatar with glow for current player */}
//             <Avatar
//               size="md"
//               name={player.username}
//               src={player.avatar || ''} // Use default avatar or player avatar
//               border={currentTurnPlayer === player.username ? '3px solid gold' : ''}
//               boxShadow={currentTurnPlayer === player.username ? '0 0 15px yellow' : ''}
//             />
//             <Text mt={2}>{player.username}</Text>
//           </Box>
//         );
//       })}
//     </Center>
//   );
// };

// export default PlayerCircle;


import { Box, Text, Avatar, Center } from '@chakra-ui/react';

const PlayerCircle = ({ players, currentTurnPlayer }) => {
  const radius = 150; // Radius of the circle
  const iconRadius = 40; // Radius of the player icons
  const neonColors = ['#00FFFF', '#FF00FF', '#00FF00', '#FFEA00', '#FF1493', '#1E90FF', '#FF4500'];

  // Function to calculate player positions in a circular manner
  const getPlayerPosition = (index, totalPlayers) => {
    const angle = (2 * Math.PI * index) / totalPlayers; // Calculate angle for each player
    const x = radius * Math.cos(angle); // Calculate x position
    const y = radius * Math.sin(angle); // Calculate y position
    return { x, y };
  };
  const getNeonColor = (index) => neonColors[index % neonColors.length];

  return (
    <Center position="relative" height="400px" width="400px">
      {/* Outer Square with neon effect */}
      <Box
        height="400px"
        width="450px"
        backgroundColor="rgba(0, 0, 0, 0.6)" // Semi-transparent black background for neon contrast
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        borderRadius="10px"  // Rounded corners for the square
        boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF" // Neon glow
        transition="0.3s ease"
      />

      {/* Central Circle with neon effect */}
      <Box
        height="150px"
        width="150px"
        backgroundColor="rgba(0, 0, 0, 0.8)" // Dark background
        borderRadius="full"
        display="flex"
        justifyContent="center"
        alignItems="center"
        position="absolute"
        boxShadow="0 0 25px #FF00FF, 0 0 35px #00FFFF" // Neon glow effect
        transition="0.3s ease"
      >
        <Text color="white" textShadow="0 0 10px #FF00FF, 0 0 15px #00FFFF">
          {currentTurnPlayer}'s turn
        </Text>
      </Box>
      
      {/* Player icons around the central circle with neon glow */}
      {players.map((player, index) => {
        const { x, y } = getPlayerPosition(index, players.length);
        const neonColor = getNeonColor(index);
        return (
          <Box
            key={player.username}
            position="absolute"
            transform={`translate(${x}px, ${y}px)`} // Position players around the circle
            textAlign="center"
            className="neon-player-box"
          >
            {/* Avatar with neon glow for the current player */}
            <Avatar
              size="md"
              name={player.username}
              src={player.avatar || ''} // Use default or player avatar
              bg={currentTurnPlayer === player.username ? 'gold' : neonColor}              
              border={currentTurnPlayer === player.username ? '3px solid gold' : '2px solid #00FFFF'}
              boxShadow={currentTurnPlayer === player.username ? '0 0 20px yellow' : '0 0 0px #00FFFF'}
              transition="box-shadow 0.3s ease, background-color 0.3s ease"
            />
            <Text mt={2} color="white" textShadow={`0 0 5px ${neonColor}`}>
              {player.username}
            </Text>
          </Box>
        );
      })}
    </Center>
  );
};

export default PlayerCircle;
