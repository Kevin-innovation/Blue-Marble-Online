// websocket-server.js - WebSocket server for Blue Marble Online multiplayer
const WebSocket = require('ws');
const http = require('http');

class GameServer {
  constructor(port = 8080) {
    this.port = port;
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Game state
    this.rooms = new Map(); // roomId -> Room
    this.clients = new Map(); // ws -> ClientInfo
    
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      
      // Initialize client
      const clientInfo = {
        ws: ws,
        playerId: null,
        roomId: null,
        playerName: null
      };
      
      this.clients.set(ws, clientInfo);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        message: 'Connected to Blue Marble Online server'
      });
    });
  }

  handleMessage(ws, data) {
    const { type, payload } = data;
    const clientInfo = this.clients.get(ws);

    switch (type) {
      case 'create_room':
        this.handleCreateRoom(ws, payload);
        break;
        
      case 'join_room':
        this.handleJoinRoom(ws, payload);
        break;
        
      case 'leave_room':
        this.handleLeaveRoom(ws);
        break;
        
      case 'start_game':
        this.handleStartGame(ws);
        break;
        
      case 'roll_dice':
        this.handleRollDice(ws);
        break;
        
      case 'buy_property':
        this.handleBuyProperty(ws, payload);
        break;
        
      case 'build':
        this.handleBuild(ws, payload);
        break;
        
      case 'end_turn':
        this.handleEndTurn(ws);
        break;
        
      case 'chat':
        this.handleChat(ws, payload);
        break;
        
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  handleCreateRoom(ws, payload) {
    const { playerName, maxPlayers = 4 } = payload;
    const roomId = this.generateRoomId();
    const playerId = this.generatePlayerId();

    const room = {
      id: roomId,
      hostId: playerId,
      maxPlayers: maxPlayers,
      players: new Map(),
      gameState: null,
      isStarted: false
    };

    const player = {
      id: playerId,
      name: playerName,
      ws: ws,
      isReady: false
    };

    room.players.set(playerId, player);
    this.rooms.set(roomId, room);

    const clientInfo = this.clients.get(ws);
    clientInfo.playerId = playerId;
    clientInfo.roomId = roomId;
    clientInfo.playerName = playerName;

    this.send(ws, {
      type: 'room_created',
      payload: {
        roomId: roomId,
        playerId: playerId,
        isHost: true
      }
    });

    console.log(`Room ${roomId} created by ${playerName}`);
  }

  handleJoinRoom(ws, payload) {
    const { roomId, playerName } = payload;
    const room = this.rooms.get(roomId);

    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    if (room.isStarted) {
      this.sendError(ws, 'Game already started');
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      this.sendError(ws, 'Room is full');
      return;
    }

    const playerId = this.generatePlayerId();
    const player = {
      id: playerId,
      name: playerName,
      ws: ws,
      isReady: false
    };

    room.players.set(playerId, player);

    const clientInfo = this.clients.get(ws);
    clientInfo.playerId = playerId;
    clientInfo.roomId = roomId;
    clientInfo.playerName = playerName;

    // Notify new player
    this.send(ws, {
      type: 'room_joined',
      payload: {
        roomId: roomId,
        playerId: playerId,
        isHost: false,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady
        }))
      }
    });

    // Notify other players
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
      payload: {
        playerId: playerId,
        playerName: playerName
      }
    }, ws);

    console.log(`${playerName} joined room ${roomId}`);
  }

  handleLeaveRoom(ws) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo || !clientInfo.roomId) return;

    const room = this.rooms.get(clientInfo.roomId);
    if (!room) return;

    room.players.delete(clientInfo.playerId);

    // Notify other players
    this.broadcastToRoom(clientInfo.roomId, {
      type: 'player_left',
      payload: {
        playerId: clientInfo.playerId,
        playerName: clientInfo.playerName
      }
    });

    // Delete room if empty
    if (room.players.size === 0) {
      this.rooms.delete(clientInfo.roomId);
      console.log(`Room ${clientInfo.roomId} deleted`);
    }

    clientInfo.roomId = null;
    clientInfo.playerId = null;
  }

  handleStartGame(ws) {
    const clientInfo = this.clients.get(ws);
    const room = this.rooms.get(clientInfo.roomId);

    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    if (room.hostId !== clientInfo.playerId) {
      this.sendError(ws, 'Only host can start game');
      return;
    }

    if (room.players.size < 2) {
      this.sendError(ws, 'Need at least 2 players');
      return;
    }

    room.isStarted = true;
    room.gameState = this.initializeGameState(room);

    this.broadcastToRoom(clientInfo.roomId, {
      type: 'game_started',
      payload: {
        gameState: room.gameState
      }
    });

    console.log(`Game started in room ${clientInfo.roomId}`);
  }

  handleRollDice(ws) {
    const clientInfo = this.clients.get(ws);
    const room = this.rooms.get(clientInfo.roomId);

    if (!room || !room.gameState) {
      this.sendError(ws, 'Game not started');
      return;
    }

    const gameState = room.gameState;
    if (gameState.currentPlayerId !== clientInfo.playerId) {
      this.sendError(ws, 'Not your turn');
      return;
    }

    // Roll dice
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    const isDouble = dice1 === dice2;

    const diceResult = {
      dice: [dice1, dice2],
      total: total,
      isDouble: isDouble
    };

    // Broadcast dice roll
    this.broadcastToRoom(clientInfo.roomId, {
      type: 'dice_rolled',
      payload: {
        playerId: clientInfo.playerId,
        diceResult: diceResult
      }
    });

    // Update game state (simplified)
    gameState.lastDiceRoll = diceResult;
  }

  handleBuyProperty(ws, payload) {
    const clientInfo = this.clients.get(ws);
    const room = this.rooms.get(clientInfo.roomId);

    if (!room || !room.gameState) return;

    const { tileId } = payload;

    // Broadcast property purchase
    this.broadcastToRoom(clientInfo.roomId, {
      type: 'property_bought',
      payload: {
        playerId: clientInfo.playerId,
        tileId: tileId
      }
    });
  }

  handleBuild(ws, payload) {
    const clientInfo = this.clients.get(ws);
    const room = this.rooms.get(clientInfo.roomId);

    if (!room || !room.gameState) return;

    const { tileId } = payload;

    // Broadcast building
    this.broadcastToRoom(clientInfo.roomId, {
      type: 'building_built',
      payload: {
        playerId: clientInfo.playerId,
        tileId: tileId
      }
    });
  }

  handleEndTurn(ws) {
    const clientInfo = this.clients.get(ws);
    const room = this.rooms.get(clientInfo.roomId);

    if (!room || !room.gameState) return;

    const gameState = room.gameState;
    
    // Move to next player
    const playerIds = Array.from(room.players.keys());
    const currentIndex = playerIds.indexOf(gameState.currentPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    gameState.currentPlayerId = playerIds[nextIndex];

    // Broadcast turn change
    this.broadcastToRoom(clientInfo.roomId, {
      type: 'turn_changed',
      payload: {
        currentPlayerId: gameState.currentPlayerId
      }
    });
  }

  handleChat(ws, payload) {
    const clientInfo = this.clients.get(ws);
    const { message } = payload;

    if (!clientInfo.roomId) return;

    this.broadcastToRoom(clientInfo.roomId, {
      type: 'chat_message',
      payload: {
        playerId: clientInfo.playerId,
        playerName: clientInfo.playerName,
        message: message,
        timestamp: Date.now()
      }
    });
  }

  handleDisconnect(ws) {
    const clientInfo = this.clients.get(ws);
    
    if (clientInfo && clientInfo.roomId) {
      this.handleLeaveRoom(ws);
    }
    
    this.clients.delete(ws);
  }

  initializeGameState(room) {
    const playerIds = Array.from(room.players.keys());
    
    return {
      currentPlayerId: playerIds[0],
      players: playerIds.map((id, index) => ({
        id: id,
        position: 0,
        money: 2000000,
        properties: [],
        inJail: false
      })),
      lastDiceRoll: null
    };
  }

  broadcastToRoom(roomId, message, excludeWs = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players.forEach(player => {
      if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
        this.send(player.ws, message);
      }
    });
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, errorMessage) {
    this.send(ws, {
      type: 'error',
      payload: { message: errorMessage }
    });
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  generatePlayerId() {
    return Math.random().toString(36).substring(2, 15);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Blue Marble Online WebSocket server running on port ${this.port}`);
    });
  }
}

// Start server
if (require.main === module) {
  const port = process.env.PORT || 8080;
  const server = new GameServer(port);
  server.start();
}

module.exports = GameServer;
