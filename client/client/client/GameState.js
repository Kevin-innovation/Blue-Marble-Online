// GameState.js - Manages player turn state and movement logic
import * as THREE from 'three';

export class GameState {
  constructor(tileRenderer, scene) {
    this.tileRenderer = tileRenderer;
    this.scene = scene;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.gamePhase = 'SETUP'; // SETUP, PLAYING, ENDED
    this.turnPhase = 'ROLL'; // ROLL, MOVE, ACTION, END_TURN
    
    this.maxPlayers = 4;
    this.playerColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    this.playerMeshes = [];
  }

  initializePlayers(numPlayers = 2) {
    if (numPlayers > this.maxPlayers) {
      numPlayers = this.maxPlayers;
    }

    for (let i = 0; i < numPlayers; i++) {
      const player = {
        id: i,
        name: `Player ${i + 1}`,
        color: this.playerColors[i],
        position: 0, // Current tile position
        money: 2000000, // Starting money (2M)
        properties: [], // Owned property IDs
        inJail: false,
        jailTurns: 0,
        doublesCount: 0 // Count of consecutive doubles
      };
      
      this.players.push(player);
      this.createPlayerMesh(player);
    }

    this.gamePhase = 'PLAYING';
    this.turnPhase = 'ROLL';
  }

  createPlayerMesh(player) {
    // Create a cone to represent the player
    const geometry = new THREE.ConeGeometry(0.3, 0.6, 8);
    const material = new THREE.MeshPhongMaterial({ 
      color: player.color,
      emissive: player.color,
      emissiveIntensity: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position on start tile
    const startTile = this.tileRenderer.tiles[0];
    if (startTile) {
      const startPos = startTile.children[0].position;
      mesh.position.set(
        startPos.x + (player.id * 0.4 - 0.6),
        0.5,
        startPos.z
      );
    }
    
    mesh.userData = { playerId: player.id };
    this.playerMeshes.push(mesh);
    this.scene.add(mesh);
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  movePlayer(playerId, diceRoll) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    const startPosition = player.position;
    const endPosition = (startPosition + diceRoll) % 40;
    
    // Check if player passed Start (position 0)
    if (endPosition < startPosition) {
      player.money += 200000; // Collect salary
      console.log(`${player.name} passed Start! +200,000`);
    }

    player.position = endPosition;
    this.animatePlayerMovement(player, startPosition, endPosition);
  }

  animatePlayerMovement(player, fromPos, toPos) {
    const mesh = this.playerMeshes[player.id];
    const steps = Math.abs(toPos - fromPos);
    let currentStep = 0;

    const moveStep = () => {
      if (currentStep >= steps) {
        // Movement complete
        this.onPlayerLanded(player);
        return;
      }

      currentStep++;
      const currentPos = (fromPos + currentStep) % 40;
      const tile = this.tileRenderer.tiles[currentPos];
      
      if (tile) {
        const tilePos = tile.children[0].position;
        
        // Animate to tile position
        const startY = mesh.position.y;
        const targetY = startY + 0.5;
        const duration = 200;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = this.easeInOutQuad(progress);

          mesh.position.x = mesh.position.x + (tilePos.x - mesh.position.x) * easeProgress;
          mesh.position.z = mesh.position.z + (tilePos.z - mesh.position.z) * easeProgress;
          mesh.position.y = startY + Math.sin(progress * Math.PI) * 0.5;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            mesh.position.y = 0.5;
            setTimeout(moveStep, 100);
          }
        };

        animate();
      }
    };

    moveStep();
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  onPlayerLanded(player) {
    const tileInfo = this.tileRenderer.getTileInfo(player.position);
    console.log(`${player.name} landed on ${tileInfo.name}`);
    
    this.tileRenderer.highlightTile(player.position, true);
    
    // Handle different tile types
    setTimeout(() => {
      this.tileRenderer.highlightTile(player.position, false);
      this.handleTileAction(player, tileInfo);
    }, 1000);
  }

  handleTileAction(player, tileInfo) {
    switch(tileInfo.type) {
      case 'city':
        this.handleCityTile(player, tileInfo);
        break;
      case 'chance':
        this.handleChanceTile(player);
        break;
      case 'special':
        this.handleSpecialTile(player, tileInfo);
        break;
    }
    
    this.turnPhase = 'END_TURN';
  }

  handleCityTile(player, tileInfo) {
    const tile = this.tileRenderer.tiles[tileInfo.id];
    const owner = tile.userData.owner;

    if (!owner) {
      // Property is available for purchase
      if (player.money >= tileInfo.price) {
        console.log(`${player.name} can buy ${tileInfo.name} for ${tileInfo.price}`);
        // In real implementation, prompt player to buy
      }
    } else if (owner !== player.id) {
      // Pay rent to owner
      const rent = this.calculateRent(tileInfo, tile.userData.building.userData.level);
      player.money -= rent;
      this.players[owner].money += rent;
      console.log(`${player.name} paid ${rent} rent to Player ${owner + 1}`);
    }
  }

  handleChanceTile(player) {
    console.log(`${player.name} drew a chance card`);
    // Implement chance card logic
  }

  handleSpecialTile(player, tileInfo) {
    console.log(`${player.name} is on ${tileInfo.name}`);
    
    if (tileInfo.name === 'Deserted Island') {
      player.inJail = true;
      player.jailTurns = 3;
      console.log(`${player.name} is on Deserted Island for 3 turns`);
    } else if (tileInfo.name === 'Space Travel') {
      // Move to random location
      const newPos = Math.floor(Math.random() * 40);
      player.position = newPos;
      this.animatePlayerMovement(player, player.position, newPos);
    }
  }

  calculateRent(tileInfo, buildingLevel) {
    const baseRent = tileInfo.rent || 0;
    const multiplier = 1 + (buildingLevel * 0.5);
    return Math.floor(baseRent * multiplier);
  }

  buyProperty(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    const tileInfo = this.tileRenderer.getTileInfo(tileId);
    const tile = this.tileRenderer.tiles[tileId];

    if (!player || !tileInfo || tile.userData.owner !== null) {
      return false;
    }

    if (player.money >= tileInfo.price) {
      player.money -= tileInfo.price;
      player.properties.push(tileId);
      
      this.tileRenderer.updateTile(tileId, { owner: playerId });
      
      console.log(`${player.name} bought ${tileInfo.name} for ${tileInfo.price}`);
      return true;
    }

    return false;
  }

  buildOnProperty(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    const tile = this.tileRenderer.tiles[tileId];

    if (!player || tile.userData.owner !== playerId) {
      return false;
    }

    const currentLevel = tile.userData.building.userData.level;
    if (currentLevel >= 5) {
      return false; // Max 5 buildings (4 houses + 1 hotel)
    }

    const buildCost = 100000 * (currentLevel + 1);
    if (player.money >= buildCost) {
      player.money -= buildCost;
      
      this.tileRenderer.updateTile(tileId, { 
        buildingLevel: currentLevel + 1 
      });
      
      console.log(`${player.name} built on tile ${tileId}`);
      return true;
    }

    return false;
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnPhase = 'ROLL';
    
    const currentPlayer = this.getCurrentPlayer();
    console.log(`\nTurn: ${currentPlayer.name}`);
    console.log(`Money: ${currentPlayer.money}`);
    console.log(`Position: ${currentPlayer.position}`);
  }

  handleDiceRoll(diceResult) {
    if (this.turnPhase !== 'ROLL') {
      return;
    }

    const player = this.getCurrentPlayer();
    
    // Handle doubles
    if (diceResult.isDouble) {
      player.doublesCount++;
      console.log(`${player.name} rolled doubles! (${player.doublesCount})`);
      
      if (player.doublesCount >= 3) {
        // Three doubles = go to jail
        player.inJail = true;
        player.jailTurns = 3;
        player.position = 10; // Deserted Island
        player.doublesCount = 0;
        console.log(`${player.name} rolled 3 doubles and goes to Deserted Island!`);
        this.turnPhase = 'END_TURN';
        return;
      }
    } else {
      player.doublesCount = 0;
    }

    // Handle jail
    if (player.inJail) {
      if (diceResult.isDouble) {
        player.inJail = false;
        player.jailTurns = 0;
        console.log(`${player.name} rolled doubles and escaped Deserted Island!`);
      } else {
        player.jailTurns--;
        if (player.jailTurns <= 0) {
          player.inJail = false;
          console.log(`${player.name} served time and left Deserted Island`);
        } else {
          console.log(`${player.name} remains on Deserted Island (${player.jailTurns} turns left)`);
          this.turnPhase = 'END_TURN';
          return;
        }
      }
    }

    // Move player
    this.turnPhase = 'MOVE';
    this.movePlayer(player.id, diceResult.total);
  }

  getGameState() {
    return {
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      gamePhase: this.gamePhase,
      turnPhase: this.turnPhase
    };
  }
}
