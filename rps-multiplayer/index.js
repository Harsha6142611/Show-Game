const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { start } = require('repl');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'], 
    methods: ['GET', 'POST'],
  },
});

const rooms = {}; // Stores room data

// Function to generate a dynamic deck from submitted cards
// Function to generate a dynamic deck from submitted cards (4 copies of each custom card)
const generateDynamicDeck = (room) => {
  const deck = [];
  
  // Generate 4 copies of each custom card
  room.customCards.forEach((cardName) => {
    for (let i = 0; i < 4; i++) {
      deck.push(cardName);
    }
  });

  // Shuffle the deck
  return deck.sort(() => Math.random() - 0.5);
};

// Function to distribute cards evenly among players
const distributeDynamicCards = (room) => {
  const deck = generateDynamicDeck(room);
  const cardsPerPlayer = Math.floor(deck.length / room.players.length);

  room.players.forEach((player, index) => {
    player.cards = deck.slice(index * cardsPerPlayer, index * cardsPerPlayer + cardsPerPlayer);
  });
};



// Function to remove the room if no players are left
const removeRoomIfEmpty = (roomId) => {
  if (rooms[roomId].players.length === 0) {
    delete rooms[roomId];
    console.log(`Room ${roomId} deleted as all players left.`);
  }
};

// Socket connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle room creation
  socket.on('create-room', (username, numPlayers, callback) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      players: [{ id: socket.id, username, cards: [] }],
      numPlayers,
      turnIndex: 0,
      isGameStarted: false,
      customCards: [], // Store custom card names
      cardsSubmitted: 0, // Track how many cards have been submitted
      rematchVotes:0,
      rematchRequested: false,
      chatHistory: [],
    };
    socket.join(roomId);
    callback({ roomId, players: rooms[roomId].players });
    console.log(`Room ${roomId} created with ${username} as the first player.`);
  });

  // Handle player joining a room
  socket.on('join-room', (roomId, username, callback) => {
    const room = rooms[roomId];
    if (room && room.players.length < room.numPlayers) {
      room.players.push({ id: socket.id, username, cards: [] });
      socket.join(roomId);
      callback({ success: true, players: room.players });
      io.in(roomId).emit('update-players', room.players);
      if (room.players.length === room.numPlayers) {
        io.in(roomId).emit('room-full');
        console.log(`Room ${roomId} is now full.`);
      }
    } else {
      callback({
        success: false,
        message: 'Room is full or does not exist',
      });
    }
  });

  // Start the game
  socket.on('start-game', (roomId) => {
    console.log("game started "+roomId);
    const room = rooms[roomId];
    if (room && room.players.length === room.numPlayers) {
      if (room.customCards.length === 0) {
        return io.in(roomId).emit('error', {
          message: 'Cards have not been submitted yet!',
        });
      }

      distributeDynamicCards(room);
      room.isGameStarted = true;

      room.players.forEach((player) => {
        io.to(player.id).emit('game-started', {
          cards: player.cards,
          turnPlayer: room.players[room.turnIndex].username,
        });
      });
    }
  });

  socket.on('submit-cards', (roomId, customCardNames, callback) => {
    console.log("Room Id: " + roomId);
    const room = rooms[roomId];
    
    if (!room) {
      if (typeof callback === 'function') {
        return callback({ success: false, message: 'Room not found' });
      }
      return;
    }
  
    // Store custom card names in the room (without generating the deck yet)
    // room.customCards = room.customCards.concat(customCardNames);
    room.customCards.push(...customCardNames);
    room.cardsSubmitted += 1;
  
    // Once all players have submitted their custom cards, start the game
    if (room.cardsSubmitted === room.numPlayers) {
      distributeDynamicCards(room); // Generate deck and distribute cards
      room.isGameStarted = true;
  
      room.players.forEach((player) => {
        io.to(player.id).emit('game-started', {
          cards: player.cards,
          turnPlayer: room.players[room.turnIndex].username,
        });
      });
    }
  
    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });

  // Handle card passing
  socket.on('pass-card', (roomId, cardToPass, callback) => {
    const room = rooms[roomId];
    if (!room || !room.isGameStarted) return;
    const currentPlayer = room.players[room.turnIndex];
    if (currentPlayer.id !== socket.id) {
      return callback({ success: false, message: "It's not your turn!" });
    }

    const cardIndex = currentPlayer.cards.indexOf(cardToPass);
    if (cardIndex > -1) {
      currentPlayer.cards.splice(cardIndex, 1);
    } else {
      return callback({ success: false, message: 'Card not found in your hand!' });
    }

    const nextPlayerIndex = (room.turnIndex + 1) % room.numPlayers;
    const nextPlayer = room.players[nextPlayerIndex];
    nextPlayer.cards.push(cardToPass);

    io.to(currentPlayer.id).emit('update-cards', {
      UpdatedCards: currentPlayer.cards,
      username: currentPlayer.username,
      roomId: roomId,
    });
    io.to(nextPlayer.id).emit('update-cards', {
      UpdatedCards: nextPlayer.cards,
      username: nextPlayer.username,
      roomId: roomId,
    });
    room.turnIndex = nextPlayerIndex;

    io.in(roomId).emit('next-turn', {
      nextTurnPlayer: nextPlayer.username,
    });

    io.in(roomId).emit('update-players', room.players.map((player) => ({
      username: player.username,
      numCards: player.cards.length,
    })));

    callback({ success: true });
  });

  // Declare game winner
  socket.on('game-won', (data) => {
    io.in(data.roomId).emit('game-won', { winner: data.winner });
    console.log(`Player ${data.winner} has won the game in room ${data.roomId}`);
  });

  // Handle rematch request
  socket.on('request-rematch', (roomId, username, callback) => {
    const room = rooms[roomId];
    if (!room) return callback({ success: false, message: 'Room not found' });

    room.rematchVotes += 1;

    io.in(roomId).emit('rematch-vote', {
      rematchVotes: room.rematchVotes,
      totalPlayers: room.numPlayers,
    });

    // If all players voted for a rematch, reset the room and start a new game
    if (room.rematchVotes === room.numPlayers) {
      console.log(`Room ${roomId}: All players voted for a rematch. Restarting game.`);
      room.rematchVotes = 0;
      room.cardsSubmitted = 0;
      room.turnIndex = 0;
      room.isGameStarted = false;

       // Regenerate and distribute cards
   // Generate a new deck
    distributeDynamicCards(room); // Distribute the new cards among the players

    // Emit the new card data to all players
    room.players.forEach((player) => {
      io.to(player.id).emit('start-rematch', {cards: player.cards});
    });

    const playerUsernames = room.players.map(player => player.username);
      io.in(roomId).emit('rematch-ready', { username: playerUsernames, updatedRoomId: roomId });
      
    }

    callback({ success: true });
  });

  // Handle player exit
socket.on('exit-game', (roomId, callback) => {
  const room = rooms[roomId];
  if (!room) {
    return callback({ success: false, message: 'Room not found' });
  }

  const playerIndex = room.players.findIndex((player) => player.id === socket.id);
  
  if (playerIndex === -1) {
    return callback({ success: false, message: 'Player not found in room' });
  }

  const username = room.players[playerIndex].username;
  room.players.splice(playerIndex, 1); // Remove player from the room
  socket.leave(roomId); // Make the player leave the socket room

  io.in(roomId).emit('update-players', room.players); // Notify other players
  // io.in(roomId).emit('player-exited', { username }); // Inform that a player exited

  // If no players are left, delete the room
  if (room.players.length === 0) {
    delete rooms[roomId];
    console.log(`Room ${roomId} deleted as all players left.`);
  }

  callback({ success: true, message: `${username} has left the game` });
});


// Handle sending and receiving chat messages
socket.on('sendMessage', (roomId, message, username, callback) => {
  console.log("Sending message: " + message + " to room: " + roomId);
  const room = rooms[roomId];
  if (!room) {
    return callback({ success: false, message: 'Room not found' });
  }

  const timestamp = new Date().toISOString();
  const chatMessage = {
    message,
    username,
    timestamp,
  };

  // Save chat message in room history
  room.chatHistory.push(chatMessage);

  // Broadcast the message to everyone in the room
  io.in(roomId).emit('receiveMessage', chatMessage);

  callback({ success: true });
});

socket.on('request-chat-history', (roomId, callback) => {
  const room = rooms[roomId];
  if (!room) {
    return callback({ success: false, message: 'Room not found' });
  }
  callback({ success: true, chatHistory: room.chatHistory });
});


  

  // Handle player disconnection
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex((player) => player.id === socket.id);

      if (playerIndex !== -1) {
        const username = room.players[playerIndex].username;
        room.players.splice(playerIndex, 1);
        io.in(roomId).emit('update-players', room.players);
        removeRoomIfEmpty(roomId);
        break;
      }
    }
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
