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
  UnorderedList,
  ListItem,
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
import PlayerCircle from './PlayerCircle';
import Chat from './Chat';
import VideoChat from './VideoChat';
const socket = io('http://localhost:3001');

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
  useEffect(() => {
    socket.on('update-players', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('player-exited', () => {
      
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
      const { nextTurnPlayer } = gameState;
      setTurnPlayer(nextTurnPlayer); // Set next player's turn
      setMessage(`${nextTurnPlayer}'s turn`);
      setSelectedCard(''); // Clear selected card when turn changes
    });

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

  const passCard = (card) => {
    if (!card) {
      setMessage('You must select a card to pass!');
      return;
    }

    socket.emit('pass-card', roomId, card, (response) => {
      if (response.success) {
        setSelectedCard(''); // Clear selected card after successful pass
        setMessage(`You passed ${card}. Waiting for the next turn...`);
      } else {
        setMessage(response.message);
      }
    });

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
    h="100vh" // Full viewport height
    w="100vw" // Full viewport width (optional)
    flexDirection="column"
    textAlign="center"
    justifyContent="center"  // Center vertically
    alignItems="center"       // Center horizontally
  >
    <Heading mb={4}>Multiplayer Card Game</Heading>
    {!isRoomCreated && currentPage==="home"? (
      <VStack spacing={4} align="center">
        <Input
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          width="300px" // Optional: Set a specific width for better alignment
        />
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
        <Button colorScheme="teal" onClick={createRoom}>
          Create Room
        </Button>

        <Heading size="md">Join Room</Heading>
        <Input
          placeholder="Enter room ID"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          width="300px" // Optional
        />
        <Button colorScheme="blue" onClick={joinRoom}>
          Join Room
        </Button>
      </VStack>
    ) : !customCardsSubmitted && isRoomCreator? (
      <VStack spacing={4} align="center">
        <Heading size="md">Enter Custom Card Names</Heading>
        {cardNames.map((cardName, index) => (
          <Input
            key={index}
            placeholder={`Card name for Player ${index + 1}`}
            value={cardName}
            onChange={(e) => handleCardNameChange(index, e.target.value)}
            width="300px"
          />
        ))}
        <Button colorScheme="green" onClick={submitCustomCardNames}>
          Submit Card Names
        </Button>
      </VStack>
    ) : (
      <>
      <Box mb={4}>
  <Text fontSize="lg" fontWeight="bold">Room ID: {roomId}</Text>
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


        {!isRoomFull ? (
          <>
            <Text>Waiting for players to join...</Text>
            <Text>Players needed: {numPlayers - players.length}</Text>
          </>
        ) : !gameStart ? (
          <Box mb={4}>
            <Text>The room is full! You can now start the game.</Text>
            <Button colorScheme="teal" onClick={startGame}>
              Start Game
            </Button> 
          </Box>
        ):(<Box></Box>)
        }

        {cards.length > 0 && (
          <VStack spacing={4}>
            <Heading size="md">Your Cards</Heading>
            <HStack>
              {cards.map((card, index) => (
                <Button
                  key={index}
                  colorScheme={selectedCard === card ? 'blue' : 'gray'}
                  onClick={() => handleCardSelection(card)}
                >
                  {card}
                </Button>
              ))}
            </HStack>

            <Button
              colorScheme="teal"
              isDisabled={!selectedCard || turnPlayer !== username}
              onClick={() => passCard(selectedCard)}
            >
              Pass Selected Card
            </Button>
          </VStack>
        )}

        <Alert status="info" mt={4}>
            <AlertIcon />
            {message}
          </Alert>

          {winner && (
            <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Game Over</ModalHeader>
                {/* <ModalCloseButton isDisabled /> */}
                <ModalBody>
                  <Text>{winner} has won the game!</Text>
                  <Button 
                  colorScheme="blue" 
                  onClick={()=>{
                    voteRematch();
                    }} 
                    mt={4} 
                    isDisabled={hasVoted}>
                    Vote for Rematch
                  </Button>
                      <Button
                        colorScheme="red"
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
