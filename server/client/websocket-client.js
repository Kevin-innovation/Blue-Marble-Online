// websocket-client.js - WebSocket client for connecting to Blue Marble Online server

export class GameClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.roomId = null;
    
    // Event handlers
    this.handlers = {
      connected: [],
      disconnected: [],
      room_created: [],
      room_joined: [],
      player_joined: [],
      player_left: [],
      game_started: [],
      dice_rolled: [],
      property_bought: [],
      building_built: [],
      turn_changed: [],
      chat_message: [],
      error: []
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('Connected to server');
          this.connected = true;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('Disconnected from server');
          this.connected = false;
          this.emit('disconnected');
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'connected':
        console.log('Server:', payload.message);
        break;

      case 'room_created':
        this.playerId = payload.playerId;
        this.roomId = payload.roomId;
        this.emit('room_created', payload);
        break;

      case 'room_joined':
        this.playerId = payload.playerId;
        this.roomId = payload.roomId;
        this.emit('room_joined', payload);
        break;

      case 'player_joined':
        this.emit('player_joined', payload);
        break;

      case 'player_left':
        this.emit('player_left', payload);
        break;

      case 'game_started':
        this.emit('game_started', payload);
        break;

      case 'dice_rolled':
        this.emit('dice_rolled', payload);
        break;

      case 'property_bought':
        this.emit('property_bought', payload);
        break;

      case 'building_built':
        this.emit('building_built', payload);
        break;

      case 'turn_changed':
        this.emit('turn_changed', payload);
        break;

      case 'chat_message':
        this.emit('chat_message', payload);
        break;

      case 'error':
        console.error('Server error:', payload.message);
        this.emit('error', payload);
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  // Event registration
  on(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event].push(handler);
    }
  }

  off(event, handler) {
    if (this.handlers[event]) {
      const index = this.handlers[event].indexOf(handler);
      if (index > -1) {
        this.handlers[event].splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }

  // Send methods
  send(type, payload = {}) {
    if (!this.connected || !this.ws) {
      console.error('Not connected to server');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  // Game actions
  createRoom(playerName, maxPlayers = 4) {
    return this.send('create_room', { playerName, maxPlayers });
  }

  joinRoom(roomId, playerName) {
    return this.send('join_room', { roomId, playerName });
  }

  leaveRoom() {
    return this.send('leave_room');
  }

  startGame() {
    return this.send('start_game');
  }

  rollDice() {
    return this.send('roll_dice');
  }

  buyProperty(tileId) {
    return this.send('buy_property', { tileId });
  }

  build(tileId) {
    return this.send('build', { tileId });
  }

  endTurn() {
    return this.send('end_turn');
  }

  sendChat(message) {
    return this.send('chat', { message });
  }

  // Getters
  isConnected() {
    return this.connected;
  }

  getPlayerId() {
    return this.playerId;
  }

  getRoomId() {
    return this.roomId;
  }
}

// Usage example:
/*
const client = new GameClient('ws://localhost:8080');

await client.connect();

// Create or join a room
client.createRoom('Player1', 4);
// OR
client.joinRoom('ABC123', 'Player2');

// Listen for events
client.on('room_created', (data) => {
  console.log('Room created:', data.roomId);
});

client.on('game_started', (data) => {
  console.log('Game started!', data.gameState);
});

client.on('dice_rolled', (data) => {
  console.log('Dice rolled:', data.diceResult);
});

client.on('turn_changed', (data) => {
  console.log('Turn changed to:', data.currentPlayerId);
});

// Game actions
client.startGame();
client.rollDice();
client.buyProperty(5);
client.build(5);
client.endTurn();
client.sendChat('Hello everyone!');
*/
