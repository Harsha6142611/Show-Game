
# Multiplayer Card Game with Bots - README

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Libraries & Technologies](#libraries--technologies)
4. [Game Rules](#game-rules)
5. [How to Setup](#how-to-setup)
6. [How to Play](#how-to-play)
7. [Contributing](#contributing)
8. [License](#license)

---

## Introduction
This project is a real-time multiplayer card game where users can create game rooms, add bots to the game, and play with custom card decks. The game is built using Node.js and Socket.IO for real-time communication, with a React frontend for user interaction. Bots are included to simulate additional players by automatically making moves during their turns.

---

## Features
- **Real-Time Multiplayer**: Create and join game rooms to play with others in real-time.
- **Customizable Card Decks**: Define custom card decks at the start of the game.
- **Bots**: Add AI-driven bot players to fill up a game room.
- **Turn-based Gameplay**: Players and bots take turns to pass cards, and the game is managed via server-side logic.
- **Responsive UI**: The frontend is built using React for a smooth and responsive user experience.

---

## Libraries & Technologies

### Backend
- **Node.js**: Server-side JavaScript runtime.
- **Socket.IO**: Enables real-time, bidirectional communication between server and clients.
- **Express**: Simplified HTTP server for API endpoints and serving static files.

### Frontend
- **React**: Frontend library for building user interfaces.
- **Socket.IO-Client**: To handle real-time communication from the client side.
  
---

## Game Rules

1. **Objective**: The game is a turn-based card game where players pass cards to other players. The goal is to manage your cards effectively and follow game-specific rules (which can vary based on custom implementations).

2. **Number of Players**: The game can have multiple players in a room, either real or AI-controlled bots.

3. **Custom Cards**: Players can submit custom card names to be used in the game.

4. **Turns**: Players take turns passing cards. When it's a bot's turn, a card is randomly picked and passed to the next player.

5. **Winning Conditions**: This can be customized according to the game rules you wish to implement (e.g., first player to pass all their cards wins).

---

## How to Setup

### Prerequisites
- **Node.js** (version >= 14.x)
- **npm** or **yarn**
  
### Clone the Repository
```bash
git clone https://github.com/yourusername/multiplayer-card-game.git
cd multiplayer-card-game
```

### Install Dependencies
Run the following command to install both server and client dependencies:
```bash
npm install
```

### Running the Server
Start the server with nodemon for auto-restarts:
```bash
npm run dev
```

### Running the Client
The frontend is built using React. Navigate to the client directory and run:
```bash
cd rps-frontend
npm install
npm run dev
```

Backend
```bash
cd rps-multiplayer
npm install
node index
```

### Access the Game
Once the server and client are running, you can open the game by navigating to `http://localhost:5173` in your web browser.
backend should run at `http://localhost:3001`

---

## How to Play

1. **Create a Room**: 
   - On the home page, create a new game room by clicking "Create Room".
   - Set a custom card deck by entering card names.

2. **Add Players**: 
   - Share the room code with other players to join the room, or add bots by clicking the "Add Bot" button.

3. **Start the Game**: 
   - Once the room has enough players, click "Start Game" to begin. Each player will receive cards.

4. **Take Turns**: 
   - On your turn, select a card and pass it to the next player.
   - If it's a bot’s turn, a card will be randomly selected and passed automatically.

5. **Win the Game**: 
   - The winner is the player who completes the objective (this can vary based on custom rules).

---

## Contributing

If you'd like to contribute to this project:
1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to your branch (`git push origin feature-branch`).
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License. Feel free to use and modify the code as per the license terms.
