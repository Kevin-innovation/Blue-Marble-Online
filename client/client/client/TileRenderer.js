// TileRenderer.js - Renders tiles with deed/building/price information
import * as THREE from 'three';

export class TileRenderer {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    this.tileData = this.initializeTileData();
  }

  initializeTileData() {
    // Blue Marble tile configuration (40 tiles total)
    return [
      { id: 0, name: 'Start', type: 'special', price: 0, color: 0xff0000 },
      { id: 1, name: 'Taipei', type: 'city', price: 50000, color: 0x8B4513, rent: 2000 },
      { id: 2, name: 'Chance', type: 'chance', price: 0, color: 0xFFD700 },
      { id: 3, name: 'Beijing', type: 'city', price: 80000, color: 0x8B4513, rent: 4000 },
      { id: 4, name: 'Manila', type: 'city', price: 80000, color: 0x8B4513, rent: 4000 },
      { id: 5, name: 'Jeju Island', type: 'special', price: 200000, color: 0x00CED1 },
      { id: 6, name: 'Singapore', type: 'city', price: 100000, color: 0x4169E1, rent: 6000 },
      { id: 7, name: 'Chance', type: 'chance', price: 0, color: 0xFFD700 },
      { id: 8, name: 'Cairo', type: 'city', price: 100000, color: 0x4169E1, rent: 6000 },
      { id: 9, name: 'Istanbul', type: 'city', price: 120000, color: 0x4169E1, rent: 8000 },
      { id: 10, name: 'Deserted Island', type: 'special', price: 0, color: 0x808080 },
      { id: 11, name: 'Athens', type: 'city', price: 140000, color: 0xFF4500, rent: 10000 },
      { id: 12, name: 'Social Welfare', type: 'special', price: 0, color: 0x90EE90 },
      { id: 13, name: 'Copenhagen', type: 'city', price: 160000, color: 0xFF4500, rent: 13000 },
      { id: 14, name: 'Stockholm', type: 'city', price: 160000, color: 0xFF4500, rent: 13000 },
      { id: 15, name: 'Concorde', type: 'special', price: 200000, color: 0x00CED1 },
      { id: 16, name: 'Bern', type: 'city', price: 180000, color: 0xFF1493, rent: 15000 },
      { id: 17, name: 'Chance', type: 'chance', price: 0, color: 0xFFD700 },
      { id: 18, name: 'Berlin', type: 'city', price: 180000, color: 0xFF1493, rent: 15000 },
      { id: 19, name: 'Ottawa', type: 'city', price: 200000, color: 0xFF1493, rent: 18000 },
      { id: 20, name: 'Free Pass', type: 'special', price: 0, color: 0x00FF00 },
      { id: 21, name: 'Buenos Aires', type: 'city', price: 220000, color: 0x9370DB, rent: 20000 },
      { id: 22, name: 'Chance', type: 'chance', price: 0, color: 0xFFD700 },
      { id: 23, name: 'Sao Paulo', type: 'city', price: 240000, color: 0x9370DB, rent: 22000 },
      { id: 24, name: 'Sydney', type: 'city', price: 240000, color: 0x9370DB, rent: 22000 },
      { id: 25, name: 'Busan', type: 'special', price: 200000, color: 0x00CED1 },
      { id: 26, name: 'Hawaii', type: 'city', price: 260000, color: 0x228B22, rent: 25000 },
      { id: 27, name: 'Lisboa', type: 'city', price: 260000, color: 0x228B22, rent: 25000 },
      { id: 28, name: 'Social Welfare', type: 'special', price: 0, color: 0x90EE90 },
      { id: 29, name: 'Madrid', type: 'city', price: 280000, color: 0x228B22, rent: 28000 },
      { id: 30, name: 'Space Travel', type: 'special', price: 0, color: 0x191970 },
      { id: 31, name: 'Tokyo', type: 'city', price: 300000, color: 0xDC143C, rent: 35000 },
      { id: 32, name: 'Chance', type: 'chance', price: 0, color: 0xFFD700 },
      { id: 33, name: 'Paris', type: 'city', price: 320000, color: 0xDC143C, rent: 38000 },
      { id: 34, name: 'Rome', type: 'city', price: 320000, color: 0xDC143C, rent: 38000 },
      { id: 35, name: 'Columbia', type: 'special', price: 200000, color: 0x00CED1 },
      { id: 36, name: 'London', type: 'city', price: 350000, color: 0x000080, rent: 50000 },
      { id: 37, name: 'Chance', type: 'chance', price: 0, color: 0xFFD700 },
      { id: 38, name: 'New York', type: 'city', price: 350000, color: 0x000080, rent: 50000 },
      { id: 39, name: 'Seoul', type: 'city', price: 1000000, color: 0x000080, rent: 200000 }
    ];
  }

  createBoard() {
    const boardSize = 40;
    const tileSize = 2;
    const gap = 0.1;
    const side = 10; // tiles per side

    for (let i = 0; i < boardSize; i++) {
      const position = this.calculatePosition(i, tileSize, gap, side);
      const tile = this.createTile(i, position, tileSize);
      this.tiles.push(tile);
      this.scene.add(tile);
    }
  }

  calculatePosition(index, tileSize, gap, side) {
    const offset = (side * (tileSize + gap)) / 2;
    const spacing = tileSize + gap;
    
    if (index < side) {
      // Bottom row (right to left)
      return {
        x: offset - (index * spacing),
        z: -offset
      };
    } else if (index < side * 2) {
      // Left column (bottom to top)
      const idx = index - side;
      return {
        x: -offset,
        z: -offset + (idx * spacing)
      };
    } else if (index < side * 3) {
      // Top row (left to right)
      const idx = index - (side * 2);
      return {
        x: -offset + (idx * spacing),
        z: offset
      };
    } else {
      // Right column (top to bottom)
      const idx = index - (side * 3);
      return {
        x: offset,
        z: offset - (idx * spacing)
      };
    }
  }

  createTile(index, position, size) {
    const tileInfo = this.tileData[index];
    const group = new THREE.Group();

    // Base tile
    const geometry = new THREE.BoxGeometry(size, 0.2, size);
    const material = new THREE.MeshPhongMaterial({ 
      color: tileInfo.color,
      emissive: tileInfo.color,
      emissiveIntensity: 0.2
    });
    const tile = new THREE.Mesh(geometry, material);
    tile.position.set(position.x, 0, position.z);
    group.add(tile);

    // Add building placeholder (for owned properties)
    const buildingGeometry = new THREE.BoxGeometry(size * 0.3, 0, size * 0.3);
    const buildingMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(position.x, 0.2, position.z);
    building.visible = false;
    building.userData = { type: 'building', level: 0 };
    group.add(building);

    // Store tile data
    group.userData = {
      tileId: index,
      tileInfo: tileInfo,
      building: building,
      owner: null
    };

    return group;
  }

  updateTile(tileId, data) {
    const tile = this.tiles[tileId];
    if (!tile) return;

    if (data.owner !== undefined) {
      tile.userData.owner = data.owner;
    }

    if (data.buildingLevel !== undefined) {
      const building = tile.userData.building;
      building.visible = data.buildingLevel > 0;
      building.userData.level = data.buildingLevel;
      
      // Scale building based on level
      const height = 0.5 + (data.buildingLevel * 0.5);
      building.scale.y = height;
      building.position.y = 0.1 + (height / 2);
    }
  }

  getTileInfo(tileId) {
    return this.tileData[tileId];
  }

  highlightTile(tileId, highlight = true) {
    const tile = this.tiles[tileId];
    if (!tile) return;

    const mesh = tile.children[0];
    if (highlight) {
      mesh.material.emissiveIntensity = 0.5;
    } else {
      mesh.material.emissiveIntensity = 0.2;
    }
  }
}
