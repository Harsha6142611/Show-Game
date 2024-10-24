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
    origin: '*', 
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
      players: [{ id: socket.id, username, cards: [], isBot:false }],
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

      console.log(`Player ${username} joined room ${roomId}`);
      socket.broadcast.to(roomId).emit('userJoined', { id: socket.id, username });
      
    } else {
      callback({
        success: false,
        message: 'Room is full or does not exist',
      });
    }
  });

  //Add Bots to the real players
  socket.on('add-bots', ({ roomId, botsToAdd, numPlayers }, callback) => {
   
    console.log("RoomId: " + roomId + " Bots to add: " + botsToAdd);  
    const room = rooms[roomId];
    console.log(room.players.length);
    console.log(numPlayers);
    console.log(room.players.length + botsToAdd <= numPlayers);
    if (room.players.length + botsToAdd <= numPlayers) {
      console.log("Adding bots");
      for (let i = 0; i < botsToAdd; i++) {
        let randomNumber = Math.floor(Math.random() * 1000);
        randomNumber = randomNumber.toString();
        const botName = `Bot_${randomNumber}`;
        room.players.push({ id:randomNumber ,username: botName,cards: [], isBot:true });
      }

      console.log(room.players);
      io.to(roomId).emit('update-players', room.players); // Notify everyone in the room about the new players
      if (room.players.length === room.numPlayers) {
        io.in(roomId).emit('room-full');
        console.log(`Room ${roomId} is now full.`);
      }
      callback({ success: true });
    } else {
      callback({ success: false, message: 'Not enough space for more bots or room does not exist' });
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
    console.log("Bot: " + currentPlayer.isBot);
    console.log("current player: " + currentPlayer.username);
    if (!currentPlayer.isBot) {
      if (currentPlayer.id !== socket.id) {
        return callback({ success: false, message: "It's not your turn!" });
      }
      const cardIndex = currentPlayer.cards.indexOf(cardToPass);
      console.log("Card index:"+cardIndex);
      if (cardIndex > -1) {
        currentPlayer.cards.splice(cardIndex, 1);
      } else {
        return callback({ success: false, message: 'Card not found in your hand!' });
      }
      
    }else if(currentPlayer.isBot){
      console.log("Bot cards: " + currentPlayer.cards);
      // console.log("Bot pass card: " + cardToPass);
      // Logic for the bot to automatically pass a card
      // For example, we'll let the bot pass the first card it has
      if (currentPlayer.cards.length > 0) {
        // Automatically choose the first card to pass
        // Check if the current player (bot or real player) has won
  const cardCounts = currentPlayer.cards.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, {});
 console.log(currentPlayer.username+" "+Object.values(cardCounts));
  const hasWon = Object.values(cardCounts).some(count => count === 4);

  if (hasWon) {
    io.in(roomId).emit('game-won', { winner: currentPlayer.username });
    console.log(`Player ${currentPlayer.username} has won the game in room ${roomId}`);
    return callback({ success: true });
  } 
        // cardToPass = currentPlayer.cards[0];
        // const cardIndex = currentPlayer.cards.indexOf(cardToPass);

        // Advanced card-passing strategy: prioritize passing cards based on frequency
    const cardProbabilities = Object.entries(cardCounts).map(([card, count]) => ({
      card,
      probability: 1 / count 
    }));

    cardProbabilities.sort((a, b) => b.probability - a.probability);
    cardToPass = cardProbabilities[0].card;
    console.log("Bot selected card to pass: " + cardToPass);
    const cardIndex = currentPlayer.cards.indexOf(cardToPass);
      console.log("Card index:"+cardIndex);
      if (cardIndex > -1) {
        currentPlayer.cards.splice(cardIndex, 1);
      } else {
        return callback({ success: false, message: 'Card not found in your hand!' });
      }
      } else {
        return callback({ success: false, message: 'No cards to pass!' });
      }
    
   

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
      isBotTurn: nextPlayer.isBot,
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
    const numberOfBots = room.players.filter(player => player.isBot).length;
    io.in(roomId).emit('rematch-vote', {
      rematchVotes: room.rematchVotes,
      totalPlayers: room.numPlayers,
    });

    // If all players voted for a rematch, reset the room and start a new game
    if (room.rematchVotes+numberOfBots === room.numPlayers) {
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
