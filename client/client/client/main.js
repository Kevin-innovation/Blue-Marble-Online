import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202530);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 10, 14);
camera.lookAt(0, 0, 0);

const light = new THREE.DirectionalLight(0xffffff, 1.1);
light.position.set(10, 15, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// Board: simple square path 40 tiles prototype (Monopoly-like)
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const TILE_COUNT = 40;
const SIDE = TILE_COUNT / 4; // 10 per side
const TILE_SIZE = 1;
const HALF = (SIDE - 1) * TILE_SIZE * 0.5;

const tileMatNormal = new THREE.MeshPhongMaterial({ color: 0x2e86de });
const tileMatSpecial = new THREE.MeshPhongMaterial({ color: 0xe67e22 });
const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.2, TILE_SIZE);

function makeTile(x, z, special = false) {
  const mesh = new THREE.Mesh(tileGeo, special ? tileMatSpecial : tileMatNormal);
  mesh.position.set(x, 0, z);
  boardGroup.add(mesh);
  return mesh;
}

// layout around a square
const coords = [];
for (let i = 0; i < SIDE; i++) coords.push([-HALF + i * TILE_SIZE, -HALF]); // bottom row -> right
for (let i = 1; i < SIDE; i++) coords.push([HALF, -HALF + i * TILE_SIZE]); // right col -> up
for (let i = SIDE - 2; i >= 0; i--) coords.push([-HALF + i * TILE_SIZE, HALF]); // top row -> left
for (let i = SIDE - 2; i > 0; i--) coords.push([-HALF, -HALF + i * TILE_SIZE]); // left col -> down

const specialIdx = new Set([0, 10, 20, 30]); // corners as special (start, jail, free, go-to-jail)
const tiles = coords.map(([x, z], idx) => makeTile(x, z, specialIdx.has(idx)));

// Player token (a simple sphere)
const tokenGeo = new THREE.SphereGeometry(0.3, 24, 16);
const tokenMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.2, roughness: 0.6 });
const token = new THREE.Mesh(tokenGeo, tokenMat);
scene.add(token);
let tokenIndex = 0;

function placeToken(index) {
  const p = tiles[index].position;
  token.position.set(p.x, 0.5, p.z);
}
placeToken(0);

// simple camera controls (orbit-lite)
let isDown = false, lastX = 0, lastY = 0, yaw = 0.8, pitch = 0.5, dist = 16;
function updateCamera() {
  const cx = Math.cos(yaw) * Math.cos(pitch) * dist;
  const cy = Math.sin(pitch) * dist;
  const cz = Math.sin(yaw) * Math.cos(pitch) * dist;
  camera.position.set(cx, Math.max(4, cy), cz);
  camera.lookAt(0, 0, 0);
}
updateCamera();

window.addEventListener('mousedown', (e) => { isDown = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', () => { isDown = false; });
window.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  const dx = (e.clientX - lastX) * 0.005;
  const dy = (e.clientY - lastY) * 0.005;
  yaw -= dx; pitch = Math.max(-1.2, Math.min(1.2, pitch - dy));
  lastX = e.clientX; lastY = e.clientY;
  updateCamera();
});
window.addEventListener('wheel', (e) => { dist = Math.max(8, Math.min(40, dist + e.deltaY * 0.01)); updateCamera(); });
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// demo movement: advance one tile per second
let tAccum = 0;
function animate(ts) {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// press Space to move 1 tile
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    tokenIndex = (tokenIndex + 1) % tiles.length;
    placeToken(tokenIndex);
  }
});
