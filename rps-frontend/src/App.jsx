import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import {
  Button,
  Input,
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Alert,
  AlertIcon,
  Center,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Flex
} from '@chakra-ui/react';
import './App.css'; // Import the CSS file for styling
import PlayerCircle from './Components/PlayerCircle';
import Chat from './Components/Chat';
import VideoChat from './Components/VideoChat';
import { motion } from 'framer-motion';
const MotionButton = motion(Button);

// const socket = io('https://show-game.onrender.com');
const socket = io("http://localhost:3001");


const App = () => {
  const [username, setUsername] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [numPlayers, setNumPlayers] = useState(2); // Default to 2 players
  const [players, setPlayers] = useState([]);
  const [isRoomFull, setIsRoomFull] = useState(false);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [cards, setCards] = useState([]); // Player's own cards
  const [turnPlayer, setTurnPlayer] = useState(''); // Player whose turn it is
  const [selectedCard, setSelectedCard] = useState(''); // Card selected by the current player
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState(''); // To store the winner's name
  const { isOpen, onOpen, onClose } = useDisclosure(); // Modal state for winner announcement
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [gameStart, setGameStart] = useState(false);
  const [cardNames, setCardNames] = useState([]); // Store the custom card names
  const [customCardsSubmitted, setCustomCardsSubmitted] = useState(false); // Flag to check if cards are submitted
  const [rematchVotes, setRematchVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [botsadd , setBotsAdded] = useState(false);
  const [isBot, setIsBot] = useState(false);
  const neonColors = ['#00FFFF', '#FF00FF', '#00FF00', '#FFEA00', '#FF1493', '#1E90FF', '#FF4500'];
  // Function to consistently map cards to the same color
  const getNeonColor = (card) => {
    // Create a hash based on the card name to consistently assign the same color
    const hash = Array.from(card).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return neonColors[hash % neonColors.length];
  };

  useEffect(() => {
    if (isBot) {
      // If `isBot` state is true, handle the bot's turn
      console.log("Bot's turn detected in useEffect.");
      handleBotTurn(); // Call handleBotTurn only when `isBot` is updated
    }
  }, [isBot]);

  
  
  useEffect(() => {
    socket.on('update-players', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('room-full', () => {
      setIsRoomFull(true);
    });

    socket.on('game-started', (gameData) => {
      const { cards, turnPlayer } = gameData;
      setCards(cards || []); // Set the player's cards
      setTurnPlayer(turnPlayer); // Set whose turn it is
      setMessage('Game has started!');
      setGameStart(true);
      setRematchVotes(0);
    });

    socket.on('next-turn', (gameState) => {
      const { nextTurnPlayer, isBotTurn } = gameState;
      setIsBot(isBotTurn);
      setTurnPlayer(nextTurnPlayer); // Set next player's turn
      setMessage(`${nextTurnPlayer}'s turn`);
      setSelectedCard(''); // Clear selected card when turn changes
    });

    // socket.on('update-cards', (data) => {

    //   const { UpdatedCards } = data;
    //   console.log('Updated cards for:', data.username);
    //   setCards(UpdatedCards); // Update the player's cards with the new data
      

    // });

    socket.on('update-cards', (data) => {
      const { UpdatedCards } = data;
      setCards(UpdatedCards); // Update the player's cards with the new data

      const cardCounts = UpdatedCards.reduce((acc, card) => {
        acc[card] = (acc[card] || 0) + 1;
        return acc;
      }, {});
      const hasWon = Object.values(cardCounts).some((count) => count === 4);

      if (hasWon) {
        socket.emit('game-won', { winner: data.username, roomId: data.roomId });
        setMessage(`You have won the game! ${data.username}`);
        setWinner(data.username); // Set the winner's name
        onOpen(); // Open the modal
      }
    });

    socket.on('game-won', (winner) => {
      console.log(winner);
      setMessage(`${winner.winner} has won the game!`);
      setWinner(winner.winner); // Set the winner's name
      onOpen(); // Open the modal
    });

    socket.on('rematch-vote', (data) => {
      const { rematchVotes, totalPlayers } = data;
      setRematchVotes(rematchVotes); // Update rematch vote count
      setMessage(`Rematch votes: ${rematchVotes}/${totalPlayers}`);
    });

    socket.on('rematch-ready', (data) => {
      console.log("Rematch ready", data);
      const { username, updatedRoomId } = data;
      setRoomId(updatedRoomId); // Update the room ID for the rematch
      setMessage(`${username} is ready for a rematch!`);
      setRematchVotes(0); // Reset rematch votes
      socket.emit('start-game', updatedRoomId);
      setHasVoted(false);
    });

    socket.on('start-rematch', (data) => {
      console.log(data);
      const { cards } = data;
      console.log(cards);
      setGameStart(true); // Start the game
      setMessage("The rematch is starting!");
      setCards(cards); // Clear player cards for the new game
      setWinner(''); // Reset winner state
      
    });

    
    return () => {
      socket.off('update-players');
      socket.off('room-full');
      socket.off('game-started');
      socket.off('next-turn');
      socket.off('update-cards');
      socket.off('game-won');
      socket.off('rematch-vote');
      socket.off('rematch-ready');
      socket.off('start-rematch');
    };
  }, []);

  const createRoom = () => {
    if (username) {
      socket.emit('create-room', username, numPlayers, (response) => {
        setRoomId(response.roomId);
        setPlayers(response.players);
        setIsRoomCreated(true);
        setIsRoomFull(false);
        setIsRoomCreator(true);
        setCardNames(Array(numPlayers).fill(''));
        setCurrentPage("");
      });
    } else {
      alert('Please enter a username');
    }
  };
  

  const joinRoom = () => {
    if (roomIdInput && username) {
      socket.emit('join-room', roomIdInput, username, (response) => {
        if (response.success) {
          setRoomId(roomIdInput);
          setPlayers(response.players);
          setIsRoomCreated(true);
          setCustomCardsSubmitted(true);
          setIsRoomCreator(false);
          
        } else {
          alert(response.message);
        }
      });
    } else {
      alert('Please enter both a room ID and username');
    }
  };


  const startGame = () => {
    socket.emit('start-game', roomId);
  };

  const handleBotTurn = () => {
    console.log("Bot Turn");
    setTimeout(() => {
        passCard(); 
      
    }, 3000); 
  };



  const passCard = (card) => {
    console.log("Is bot:", isBot);
  
    // If it's a bot, let the backend choose the card to pass
    if (isBot && !card) {
      // Handle bot's card passing logic here (set a default card or handle bot-specific logic)
      console.log("Passing card for bot automatically");
      socket.emit('pass-card', roomId, null, (response) => {
        if (response.success) {
          setSelectedCard(''); // Clear selected card after successful pass
          setMessage(`Bot passed a card. Waiting for the next turn...`);
        } else {
          setMessage(response.message);
        }
      });
    } else {
      // If no card is selected and it's a player's turn, show an error
      if (!card && !isBot) {
        setMessage('You must select a card to pass!');
        console.log("No card selected");
        return;
      }
  
      console.log("Passing card:", card || 'bot turn');
      socket.emit('pass-card', roomId, card || null, (response) => {
        if (response.success) {
          setSelectedCard(''); // Clear selected card after successful pass
          setMessage(`You passed ${card}. Waiting for the next turn...`);
        } else {
          setMessage(response.message);
        }
      });
    }
  };
  
  const handleCardSelection = (card) => {
    setSelectedCard(card); // Set the selected card
  };

  // Handle input change for custom card names
  const handleCardNameChange = (index, value) => {
    const updatedCardNames = [...cardNames];
    updatedCardNames[index] = value;
    setCardNames(updatedCardNames);
  };

  // Submit custom card names to the backend
  const submitCustomCardNames = () => {
    if (cardNames.some(name => name === '')) {
      alert('Please fill in all card names');
      return;
    }

    // Ensure unique card names
    const uniqueCardNames = new Set(cardNames);
    if (uniqueCardNames.size !== cardNames.length) {
      alert('Card names must be unique!');
      return;
    }

    // Emit the card names to the backend
    socket.emit('submit-cards', roomId, cardNames, (response) => {
      if (response.success) {
        setCustomCardsSubmitted(true);
        console.log('Cards submitted successfully');
      } else {
        alert(response.message);
      }
    });
  };


  const voteRematch = () => {
    if(!hasVoted){
      setHasVoted(true);
      socket.emit('request-rematch', roomId, username, (response) => {
        if (!response.success) {
          console.error(response.message);
        }     
      });
      setMessage('Your vote for rematch has been submitted!');
    }
  
  };

  const addBotsToRoom = () => {
    const botsToAdd = numPlayers - players.length; // Calculate how many bots are needed
    console.log(botsToAdd);
    if (botsToAdd > 0) {
      socket.emit('add-bots', { roomId, botsToAdd, numPlayers }, (response) => {
        if (response.success) {
          setBotsAdded(true);
          setMessage(`${botsToAdd} bot(s) added to the room!`);
        } else {
          setMessage(response.message);
        }
      });
    } else {
      alert('Room is already full!');
    }
  };
  

  const handleExitGame = () => {
    setIsRoomCreated(false);
    setCurrentPage("home");
    setIsRoomFull(false);
    setGameStart(false);
    setHasVoted(false);
    setUsername('');       // Reset username input
    setRoomIdInput('');    // Reset room ID input
    setNumPlayers(2);      // Reset number of players to default
    setRoomId(null);       // Reset room ID
    setIsRoomCreated(false); // Reset room creation status
    setPlayers([]);        // Clear players list
    setTurnPlayer(null);   // Reset turn player
    setCards([]);          // Clear cards
    setSelectedCard(null); // Reset selected card
    setWinner(null);       // Reset winner
    setRematchVotes(0);    // Reset rematch votes
    setMessage('');        // Clear any messages
    setCustomCardsSubmitted(false); // Reset custom cards submission status
    setCardNames([]);  
    setIsBot(false);
    setBotsAdded(false);
    socket.emit('exit-game', roomId, (response) => {
      if (response.success) {
        // Redirect to home or perform necessary UI updates
        console.log(response.message);
        
      } else {
        console.error(response.message);
      }
    });
  };
  
  return (
     <Center     
     as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      h="100vh"
      w="100vw"
      flexDirection="column"
      textAlign="center"
      justifyContent="center"
      alignItems="center">
    <Heading  mb={4} textShadow="0 0 20px #FF00FF, 0 0 15px #00FFFF" >Multiplayer Card Game</Heading>
    {!isRoomCreated && currentPage==="home"? (
      <VStack spacing={4} align="center">
        <Input
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          width="300px" // Optional: Set a specific width for better alignment
          border="2px solid #00FFFF"
            _hover={{ boxShadow: '0 0 30px #FF00FF' }}
            _focus={{
              boxShadow: '0 0 40px #FF00FF, 0 0 50px #00FFFF',
              borderColor: '#FF00FF',
            }}
            transition="all 0.4s ease"
            bg="blackAlpha.800"
            color="white"
            textShadow="0 0 5px #00FFFF"

        /> <br />
        <Heading size="md">Create Room</Heading>
        <Input
          type="number"
          placeholder="Number of players"
          value={numPlayers}
          onChange={(e) => {
            const value = Math.max(2, Math.min(8, parseInt(e.target.value, 10) || 2));
            setNumPlayers(value);  }}
            min={2} // Minimum value
            max={8}
          width="300px" // Optional
        />
        {/* <Button colorScheme="teal" onClick={createRoom}>
          Create Room
        </Button> */}

        <MotionButton
            colorScheme="teal"
            size="lg"
            bg="blackAlpha.800"
            _hover={{
              boxShadow: '0 0 30px #FF00FF, 0 0 40px #00FFFF',
              transform: 'scale(1.1)',
            }}
            boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF"
            transition="all 0.4s"
            whileTap={{ scale: 0.9 }}
            onClick={createRoom}
          >
            Create Room
          </MotionButton>
  
          <br />
        <Heading size="md">Join Room</Heading>
        <Input
          placeholder="Enter room ID"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          width="300px" // Optional
        />
        {/* <Button colorScheme="blue" onClick={joinRoom}>
          Join Room
        </Button> */}
        <MotionButton
            colorScheme="teal"
            size="lg"
            bg="blackAlpha.800"
            _hover={{
              boxShadow: '0 0 30px #FF00FF, 0 0 40px #00FFFF',
              transform: 'scale(1.1)',
            }}
            boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF"
            transition="all 0.4s"
            whileTap={{ scale: 0.9 }}
            onClick={joinRoom}
          >
            Join Room
          </MotionButton>
      </VStack>
    ) : !customCardsSubmitted && isRoomCreator? (
      <VStack spacing={4} align="center">
        <Heading size="md" color="white">Enter Custom Card Names</Heading>
        {cardNames.map((cardName, index) => (
          <Input
            key={index}
            placeholder={`Card name for Player ${index + 1}`}
            value={cardName}
            onChange={(e) => handleCardNameChange(index, e.target.value)}
            width="300px"
              border="2px solid #00FFFF"
              _hover={{ boxShadow: '0 0 30px #FF00FF' }}
              transition="all 0.4s"
              bg="blackAlpha.800"
              color="white"
              textShadow="0 0 5px #00FFFF"
          />
        ))}
        {/* <Button colorScheme="green" onClick={submitCustomCardNames}>
          Submit Card Names
        </Button> */}
        <MotionButton
            colorScheme="teal"
            size="lg"
            bg="blackAlpha.800"
            _hover={{
              boxShadow: '0 0 30px #FF00FF, 0 0 40px #00FFFF',
              transform: 'scale(1.1)',
            }}
            boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF"
            transition="all 0.4s"
            whileTap={{ scale: 0.9 }}
            onClick={submitCustomCardNames}
          >
            Submit Card Names
          </MotionButton>
      </VStack>
    ) : (
      <>
      <Box mb={4}>
      <Text fontSize="lg" fontWeight="bold" color="white" textShadow="0 0 5px #00FFFF" mb={4}>
            Room ID: {roomId}
          </Text>
  <Flex justifyContent="center" alignItems="center" position="relative" gap="20px" >

    <Box position={"absolute"} left={-370}>
      <VideoChat socket={socket} roomId={roomId} username={username} />
    </Box>
    
    <Box flex="0 1 auto">
      <PlayerCircle players={players} currentTurnPlayer={turnPlayer} />
    </Box>

    <Box position="absolute" right={-20} width="10px">
      <Chat socket={socket} roomId={roomId} username={username} />
    </Box>

  </Flex>
</Box>

    
        {isRoomCreated && isRoomCreator && customCardsSubmitted && !botsadd&& (
          <MotionButton
            colorScheme="teal"
            size="lg"
            bg="blackAlpha.800"
            _hover={{
              boxShadow: '0 0 30px #FF00FF, 0 0 40px #00FFFF',
              transform: 'scale(1.1)',
            }}
            boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF"
            transition="all 0.4s"
            whileTap={{ scale: 0.9 }}
            onClick={addBotsToRoom}
          >
            Add bots
          </MotionButton>
        )
        }


        {!isRoomFull ? (
          <>
            <Text>Waiting for players to join...</Text>
            <Text>Players needed: {numPlayers - players.length}</Text>
          </>
        ) : !gameStart ? (
          <Box mb={4}>
            <Text>The room is full! You can now start the game.</Text>
            <MotionButton
            colorScheme="teal"
            size="lg"
            bg="blackAlpha.800"
            _hover={{
              boxShadow: '0 0 30px #FF00FF, 0 0 40px #00FFFF',
              transform: 'scale(1.1)',
            }}
            boxShadow="0 0 20px #00FFFF, 0 0 30px #FF00FF"
            transition="all 0.4s"
            whileTap={{ scale: 0.9 }}
            onClick={startGame}
          >
            Start Game
          </MotionButton>
          </Box>
        ):(<Box></Box>)
        }

        {
          cards.length > 0 && (
      <VStack spacing={6}>
        <Heading size="lg" color="white">Your Cards</Heading>
        <HStack spacing={6}>
          {cards.map((card, index) => {
            const cardColor = getNeonColor(card);  // Assign color based on card name

            return (
              <MotionButton
                key={index}
                onClick={() => handleCardSelection(card)}
                size="lg"
                sx={{
                  bg: selectedCard === card ? cardColor : 'blackAlpha.900',  // Change background on selection only
                  color: selectedCard === card ? 'black' : cardColor,  // Change text color on selection only
                  fontSize: '1.2rem', // Larger font for cards
                  padding: '1.5rem',  // Padding for larger cards
                  borderRadius: '12px',
                  border: `2px solid ${cardColor}`,  // Neon border for all cards
                  height:"120px",
                  
                  boxShadow: selectedCard === card
                    ? `0 0 25px ${cardColor}` // Bright neon glow when selected
                    : 'none', // No glow when not selected
                  transition: '0.3s ease', // Smooth transitions
                }}
                // No hover color change
                whileTap={{ scale: 0.95 }}  // Press effect
              >
                {card}
              </MotionButton>
            );
          })}
        </HStack>

        <MotionButton
          colorScheme="teal"
          isDisabled={!selectedCard || turnPlayer !== username}
          onClick={() => passCard(selectedCard)}
          size="lg"
          sx={{
            bg: selectedCard ? 'blackAlpha.900' : 'gray.700',
            color: selectedCard ? 'white' : 'gray.500',
            padding: '1.5rem',
            borderRadius: '12px',
            border: `2px solid ${selectedCard ? getNeonColor(selectedCard) : 'gray'}`, // Neon border when a card is selected
            boxShadow: selectedCard
              ? `0 0 25px ${getNeonColor(selectedCard)}`  // Neon glow when a card is selected
              : 'none',
            transition: '0.3s ease',
          }}
          whileTap={{ scale: 0.95 }}
        >
          Pass Selected Card
        </MotionButton>
      </VStack>
    )
        }

        <Alert status="info" mt={4} className='alert'>
            <AlertIcon />
            {message}
          </Alert>

          {winner && (
            <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
              <ModalOverlay />
              <ModalContent
              as={motion.div}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                bg="rgba(0, 0, 0, 0.95)"
                color="white"
                border="2px solid #FF00FF"
                boxShadow="0 0 40px #FF00FF, 0 0 60px #00FFFF"
              >
                <ModalHeader>Game Over</ModalHeader>
                {/* <ModalCloseButton isDisabled /> */}
                <ModalBody>
                  <Text>{winner} has won the game!</Text>
                  <Button 
                  colorScheme="BlackAlpha.800" 
                  onClick={()=>{
                    voteRematch();
                    }} 
                    mt={4} 
                    isDisabled={hasVoted}>
                    Vote for Rematch
                  </Button>
                      <Button
                        colorScheme="RedAlpha.800"
                        onClick={()=>{
                          handleExitGame();
                          onClose();
                        }}
                        mt={4}
                        ml={2}  // Add some margin between the buttons
                      >
                        Exit Room
                      </Button>
                  {rematchVotes > 0 && (
                    <Text mt={2}>Votes for rematch: {rematchVotes}</Text>
                  )}
                </ModalBody>
              </ModalContent>
            </Modal>
          )}
      </>
    )}
  </Center>
  );
};

export default App;
