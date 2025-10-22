# Blue Marble Online - Architecture Documentation

## Overview

This document describes the architecture of Blue Marble Online, a multiplayer board game built with Three.js for 3D rendering and WebSocket for real-time multiplayer communication.

## Project Structure

```
Blue-Marble-Online/
├── client/client/client/          # Client-side application
│   ├── TileRenderer.js            # Three.js tile rendering
│   ├── DiceRoller.js              # Dice rolling with animation
│   ├── GameState.js               # Player turn state and movement logic
│   └── main.js                    # Main application entry point
│
├── server/                        # Server-side application
│   ├── websocket-server.js        # WebSocket server implementation
│   └── client/                    # Client-side WebSocket handler
│       └── websocket-client.js    # WebSocket client class
│
├── README.md                      # Project README
├── marblerule.md                  # Game rules
└── ARCHITECTURE.md               # This file
```

## Client Architecture

### 1. TileRenderer.js

**Purpose**: Manages the 3D rendering of the game board tiles using Three.js.

**Key Features**:
- Renders 40 tiles in a board layout (10 tiles per side)
- Each tile displays:
  - Tile color based on city group
  - Property price information
  - Building level (houses/hotels)
  - Owner information
- Supports tile highlighting for player movement
- Animates building construction

**Main Methods**:
- `createBoard()`: Creates the initial 3D board
- `createTile(index, position, size)`: Creates individual tile with geometry
- `updateTile(tileId, data)`: Updates tile state (ownership, buildings)
- `getTileInfo(tileId)`: Returns tile data (name, price, rent)
- `highlightTile(tileId, highlight)`: Highlights tiles during gameplay

**Tile Data Structure**:
```javascript
{
  id: number,           // Tile ID (0-39)
  name: string,         // City/Special name
  type: string,         // 'city', 'chance', 'special'
  price: number,        // Purchase price
  color: hex,           // Tile color
  rent: number          // Base rent amount
}
```

### 2. DiceRoller.js

**Purpose**: Handles dice rolling mechanics with 3D animation.

**Key Features**:
- Rolls two six-sided dice (2D6)
- Creates 3D dice with dot textures for each face
- Animated rolling with physics-like motion
- Detects doubles (both dice showing same value)
- Visual feedback with bouncing animation

**Main Methods**:
- `roll(callback)`: Rolls dice and calls callback with results
- `animateRoll(results)`: Animates the dice rolling
- `createDotTexture(number)`: Creates texture for dice face
- `setDieFace(die, value)`: Rotates die to show correct face

**Dice Result Structure**:
```javascript
{
  dice: [number, number],  // Individual die values (1-6)
  total: number,           // Sum of both dice
  isDouble: boolean        // True if both dice match
}
```

### 3. GameState.js

**Purpose**: Manages game state, player turns, and movement logic.

**Key Features**:
- Tracks all player information (position, money, properties)
- Manages turn order and phases
- Handles player movement with animation
- Implements game rules:
  - Passing Start (collect salary)
  - Landing on properties (buy/pay rent)
  - Deserted Island (jail) mechanics
  - Doubles detection and consequences
  - Building construction
- Handles tile actions (city, chance, special)

**Main Methods**:
- `initializePlayers(numPlayers)`: Sets up players at game start
- `movePlayer(playerId, diceRoll)`: Moves player and handles tile landing
- `handleDiceRoll(diceResult)`: Processes dice roll results
- `buyProperty(playerId, tileId)`: Handles property purchase
- `buildOnProperty(playerId, tileId)`: Adds buildings to owned properties
- `nextTurn()`: Advances to next player's turn
- `getCurrentPlayer()`: Returns current player object

**Player Data Structure**:
```javascript
{
  id: number,
  name: string,
  color: hex,
  position: number,       // Current tile (0-39)
  money: number,          // Current cash
  properties: [tileId],   // Owned property IDs
  inJail: boolean,
  jailTurns: number,
  doublesCount: number    // Consecutive doubles rolled
}
```

**Turn Phases**:
1. `ROLL`: Player rolls dice
2. `MOVE`: Player piece moves on board
3. `ACTION`: Player takes action on landed tile
4. `END_TURN`: Turn ends, next player begins

## Server Architecture

### websocket-server.js

**Purpose**: WebSocket server for multiplayer game sessions.

**Key Features**:
- Room-based multiplayer (up to 4 players per room)
- Real-time game state synchronization
- Event broadcasting to all players in a room
- Handles disconnections and reconnections

**Message Types**:

**Client → Server**:
- `create_room`: Create a new game room
- `join_room`: Join an existing room
- `leave_room`: Leave current room
- `start_game`: Start the game (host only)
- `roll_dice`: Roll dice (current player only)
- `buy_property`: Purchase property
- `build`: Build on owned property
- `end_turn`: End current turn
- `chat`: Send chat message

**Server → Client**:
- `connected`: Connection established
- `room_created`: Room successfully created
- `room_joined`: Joined room successfully
- `player_joined`: Another player joined
- `player_left`: Player disconnected
- `game_started`: Game has started
- `dice_rolled`: Dice roll results
- `property_bought`: Property purchased
- `building_built`: Building constructed
- `turn_changed`: Turn passed to next player
- `chat_message`: Chat message received
- `error`: Error message

**Room Data Structure**:
```javascript
{
  id: string,              // Room code (6 chars)
  hostId: string,          // Host player ID
  maxPlayers: number,      // Max players (2-4)
  players: Map,            // Player ID → Player data
  gameState: object,       // Current game state
  isStarted: boolean       // Game started flag
}
```

### websocket-client.js

**Purpose**: Client-side WebSocket connection handler.

**Key Features**:
- Manages WebSocket connection lifecycle
- Event-based message handling
- Automatic message serialization/deserialization
- Promise-based connection

**Main Methods**:
- `connect()`: Establish WebSocket connection
- `disconnect()`: Close connection
- `on(event, handler)`: Register event handler
- `off(event, handler)`: Unregister event handler
- Game action methods (createRoom, joinRoom, rollDice, etc.)

**Usage Example**:
```javascript
const client = new GameClient('ws://localhost:8080');
await client.connect();

client.on('room_created', (data) => {
  console.log('Room:', data.roomId);
});

client.createRoom('PlayerName', 4);
```

## Data Flow

### Game Initialization Flow

```
1. Client connects to server
   Client → Server: WebSocket connection
   Server → Client: 'connected' message

2. Create/Join room
   Client → Server: 'create_room' or 'join_room'
   Server → Client: 'room_created' or 'room_joined'
   Server → All: 'player_joined' (broadcast)

3. Start game
   Client (host) → Server: 'start_game'
   Server → All: 'game_started' with initial state
```

### Turn Flow

```
1. Roll dice
   Client → Server: 'roll_dice'
   Server → All: 'dice_rolled' with results
   Client: GameState.handleDiceRoll()
   Client: TileRenderer shows movement

2. Land on tile
   Client: GameState.onPlayerLanded()
   Client: TileRenderer.highlightTile()
   Client: Handle tile action (buy/pay rent)

3. Take action
   Client → Server: 'buy_property' or 'build'
   Server → All: 'property_bought' or 'building_built'
   Client: TileRenderer.updateTile()

4. End turn
   Client → Server: 'end_turn'
   Server → All: 'turn_changed'
   Client: GameState.nextTurn()
```

## Technology Stack

- **Frontend**:
  - Three.js: 3D rendering engine
  - WebSocket API: Real-time communication
  - ES6 Modules: Code organization

- **Backend**:
  - Node.js: Server runtime
  - ws: WebSocket library
  - JavaScript ES6+: Server logic

## Network Protocol

### Message Format

All messages use JSON format:

```javascript
{
  type: string,    // Message type identifier
  payload: object  // Message data (optional)
}
```

### Example Messages

**Create Room**:
```javascript
// Client → Server
{
  type: 'create_room',
  payload: {
    playerName: 'Alice',
    maxPlayers: 4
  }
}

// Server → Client
{
  type: 'room_created',
  payload: {
    roomId: 'ABC123',
    playerId: 'xyz789',
    isHost: true
  }
}
```

**Roll Dice**:
```javascript
// Client → Server
{
  type: 'roll_dice',
  payload: {}
}

// Server → All
{
  type: 'dice_rolled',
  payload: {
    playerId: 'xyz789',
    diceResult: {
      dice: [3, 5],
      total: 8,
      isDouble: false
    }
  }
}
```

## Game Rules Implementation

### Core Mechanics

1. **Movement**:
   - Roll 2D6 to move
   - Move clockwise around board
   - Pass Start = collect 200,000

2. **Properties**:
   - Land on unowned property = option to buy
   - Land on owned property = pay rent to owner
   - Owner can build (up to 5 levels: 4 houses + 1 hotel)

3. **Special Tiles**:
   - Start: Collect salary when passing
   - Deserted Island: Jail mechanics (3 turns or roll doubles)
   - Chance: Random event cards
   - Social Welfare: Collect/pay taxes
   - Travel tiles: Teleport or special actions

4. **Doubles**:
   - Roll again if doubles
   - 3 consecutive doubles = go to Deserted Island

5. **Building**:
   - Must own property to build
   - Increases rent exponentially
   - Max 5 buildings per property

## Future Enhancements

1. **Chance Cards**: Implement random event system
2. **Property Trading**: Player-to-player trades
3. **Bankruptcy**: Handle player elimination
4. **AI Players**: Computer-controlled opponents
5. **Mobile Support**: Touch controls and responsive UI
6. **Persistence**: Save/load game state
7. **Spectator Mode**: Watch ongoing games
8. **Chat System**: In-game communication
9. **Leaderboards**: Player statistics and rankings
10. **Custom Rules**: Configurable game variants

## Development Setup

### Server

```bash
cd server
npm install ws
node websocket-server.js
```

### Client

```bash
cd client/client/client
# Serve with any HTTP server
python -m http.server 8000
# Open http://localhost:8000 in browser
```

## Testing

### Manual Testing Flow

1. Start server
2. Open multiple browser tabs
3. Create room in first tab
4. Join room in other tabs
5. Start game and test:
   - Dice rolling
   - Player movement
   - Property purchase
   - Building construction
   - Turn changes
   - Disconnection handling

## Performance Considerations

1. **Client**:
   - Three.js scene optimization
   - Minimize draw calls
   - Efficient animation loops
   - Memory management for textures

2. **Server**:
   - Room cleanup on empty
   - Client disconnection handling
   - Message validation
   - Rate limiting for actions

## Security Considerations

1. **Input Validation**: All client messages validated
2. **Turn Enforcement**: Server verifies it's player's turn
3. **Action Validation**: Check player can afford actions
4. **Room Access**: Prevent joining full/started games
5. **Anti-Cheat**: Server-side game state authority

## License

MIT License - See LICENSE file for details

---

**Last Updated**: October 2025  
**Version**: 1.0.0-prototype  
**Authors**: Blue Marble Online Development Team
