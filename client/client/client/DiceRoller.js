// DiceRoller.js - Random 2D6 dice rolling functionality with animation
import * as THREE from 'three';

export class DiceRoller {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.diceGroup = new THREE.Group();
    this.dice = [];
    this.isRolling = false;
    this.rollCallback = null;
    
    this.createDice();
    this.scene.add(this.diceGroup);
  }

  createDice() {
    // Create two dice
    for (let i = 0; i < 2; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const materials = [
        new THREE.MeshPhongMaterial({ color: 0xffffff, map: this.createDotTexture(1) }),
        new THREE.MeshPhongMaterial({ color: 0xffffff, map: this.createDotTexture(6) }),
        new THREE.MeshPhongMaterial({ color: 0xffffff, map: this.createDotTexture(2) }),
        new THREE.MeshPhongMaterial({ color: 0xffffff, map: this.createDotTexture(5) }),
        new THREE.MeshPhongMaterial({ color: 0xffffff, map: this.createDotTexture(3) }),
        new THREE.MeshPhongMaterial({ color: 0xffffff, map: this.createDotTexture(4) })
      ];
      
      const die = new THREE.Mesh(geometry, materials);
      die.position.set(i * 1.5 - 0.75, 2, 5);
      die.castShadow = true;
      die.userData = { value: 1 };
      
      this.dice.push(die);
      this.diceGroup.add(die);
    }
    
    this.diceGroup.visible = false;
  }

  createDotTexture(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    
    // Black dots
    ctx.fillStyle = '#000000';
    const dotSize = 12;
    const positions = this.getDotPositions(number);
    
    positions.forEach(pos => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  getDotPositions(number) {
    const center = 64;
    const offset = 30;
    
    const positions = {
      1: [{ x: center, y: center }],
      2: [{ x: center - offset, y: center - offset }, { x: center + offset, y: center + offset }],
      3: [{ x: center - offset, y: center - offset }, { x: center, y: center }, { x: center + offset, y: center + offset }],
      4: [
        { x: center - offset, y: center - offset },
        { x: center + offset, y: center - offset },
        { x: center - offset, y: center + offset },
        { x: center + offset, y: center + offset }
      ],
      5: [
        { x: center - offset, y: center - offset },
        { x: center + offset, y: center - offset },
        { x: center, y: center },
        { x: center - offset, y: center + offset },
        { x: center + offset, y: center + offset }
      ],
      6: [
        { x: center - offset, y: center - offset },
        { x: center + offset, y: center - offset },
        { x: center - offset, y: center },
        { x: center + offset, y: center },
        { x: center - offset, y: center + offset },
        { x: center + offset, y: center + offset }
      ]
    };
    
    return positions[number] || [];
  }

  roll(callback) {
    if (this.isRolling) return;
    
    this.isRolling = true;
    this.rollCallback = callback;
    this.diceGroup.visible = true;
    
    // Generate random results (1-6 for each die)
    const results = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    
    // Reset dice positions and rotations
    this.dice.forEach((die, i) => {
      die.position.set(i * 1.5 - 0.75, 2, 5);
      die.rotation.set(0, 0, 0);
    });
    
    // Animate the roll
    this.animateRoll(results);
    
    return results;
  }

  animateRoll(results) {
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        // Spinning animation
        this.dice.forEach((die, i) => {
          die.rotation.x += 0.2;
          die.rotation.y += 0.3;
          die.rotation.z += 0.1;
          
          // Bounce
          die.position.y = 2 + Math.sin(progress * Math.PI) * 2;
        });
        
        requestAnimationFrame(animate);
      } else {
        // Finalize positions based on results
        this.dice.forEach((die, i) => {
          die.userData.value = results[i];
          this.setDieFace(die, results[i]);
          die.position.y = 0.5;
        });
        
        // Call callback with results
        setTimeout(() => {
          this.isRolling = false;
          this.diceGroup.visible = false;
          
          if (this.rollCallback) {
            const total = results[0] + results[1];
            this.rollCallback({
              dice: results,
              total: total,
              isDouble: results[0] === results[1]
            });
          }
        }, 500);
      }
    };
    
    animate();
  }

  setDieFace(die, value) {
    // Rotate die to show the correct face
    // This is a simplified version - in a real implementation,
    // you'd calculate the exact rotation to show the desired face
    const rotations = {
      1: { x: 0, y: 0, z: 0 },
      2: { x: 0, y: Math.PI, z: 0 },
      3: { x: 0, y: Math.PI / 2, z: 0 },
      4: { x: 0, y: -Math.PI / 2, z: 0 },
      5: { x: Math.PI / 2, y: 0, z: 0 },
      6: { x: -Math.PI / 2, y: 0, z: 0 }
    };
    
    const rotation = rotations[value];
    die.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  hide() {
    this.diceGroup.visible = false;
  }

  show() {
    this.diceGroup.visible = true;
  }

  getLastRoll() {
    return this.dice.map(die => die.userData.value);
  }
}
