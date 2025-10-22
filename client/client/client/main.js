// main.js - Enhanced client with room UI, WebSocket sync, and gameplay integration
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { TileRenderer } from './TileRenderer.js';
import { GameState } from './GameState.js';
import { DiceRoller } from './DiceRoller.js';

// --------- Basic scene setup ---------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202530);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 10, 16);
camera.lookAt(0, 0, 0);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(10, 15, 10);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// --------- Render board ---------
const tileRenderer = new TileRenderer(scene);
tileRenderer.createBoard();

// --------- Game state & dice ---------
const gameState = new GameState(tileRenderer, scene);
const diceRoller = new DiceRoller(scene, camera);

// --------- Simple orbit-like camera controls ---------
let isDown = false, lastX = 0, lastY = 0, yaw = 0.8, pitch = 0.45, dist = 20;
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

// --------- UI: Room create/join & nickname ---------
// Expect these elements in index.html: #ui, #nickname, #roomId, #createBtn, #joinBtn, #leaveBtn,
// #status, #players, #startBtn, #rollBtn, #endTurnBtn, #log
const $ = (sel) => document.querySelector(sel);
const ui = {
  nickname: $('#nickname'),
  roomId: $('#roomId'),
  createBtn: $('#createBtn'),
  joinBtn: $('#joinBtn'),
  leaveBtn: $('#leaveBtn'),
  startBtn: $('#startBtn'),
  rollBtn: $('#rollBtn'),
  endTurnBtn: $('#endTurnBtn'),
  status: $('#status'),
  players: $('#players'),
  log: $('#log')
};
function log(msg) { if (ui.log) { const li = document.createElement('div'); li.textContent = msg; ui.log.prepend(li); } console.log(msg); }
function setStatus(text) { if (ui.status) ui.status.textContent = text; }
function renderPlayers(list, currentId) {
  if (!ui.players) return;
  ui.players.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div');
    div.textContent = `${p.name || p.id}${p.id === currentId ? ' (턴)' : ''}`;
    ui.players.appendChild(div);
  });
}

// --------- WebSocket client ---------
let ws = null;
let client = { roomId: null, playerId: null, isHost: false, name: null };
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + (location.hostname || 'localhost') + (location.port ? ':' + location.port : ':8080');

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket(WS_URL);
  ws.onopen = () => setStatus('서버 연결됨');
  ws.onclose = () => setStatus('연결 종료');
  ws.onerror = (e) => setStatus('연결 오류');
  ws.onmessage = (ev) => {
    const { type, payload, message } = JSON.parse(ev.data);
    switch (type) {
      case 'connected':
        log(message);
        break;
      case 'room_created':
        client = { ...client, roomId: payload.roomId, playerId: payload.playerId, isHost: payload.isHost };
        setStatus(`방 생성: ${payload.roomId}`);
        log(`방 생성됨: ${payload.roomId}`);
        break;
      case 'room_joined':
        client = { ...client, roomId: payload.roomId, playerId: payload.playerId, isHost: payload.isHost };
        setStatus(`방 입장: ${payload.roomId}`);
        renderPlayers(payload.players || [], payload.currentPlayerId);
        log(`방 참여: ${payload.roomId}`);
        break;
      case 'player_joined':
        log(`${payload.playerName} 입장`);
        break;
      case 'player_left':
        log(`${payload.playerName} 퇴장`);
        break;
      case 'game_started':
        log('게임 시작');
        syncGameFromServer(payload.gameState);
        break;
      case 'dice_rolled':
        handleRemoteDice(payload.playerId, payload.diceResult);
        break;
      case 'turn_changed':
        gameServerState.currentPlayerId = payload.currentPlayerId;
        updateTurnUI();
        break;
      case 'property_bought':
        // simple reflect on client model
        if (payload.tileId != null) tileRenderer.updateTile(payload.tileId, { owner: payload.playerId });
        break;
      case 'building_built':
        if (payload.tileId != null) tileRenderer.updateTile(payload.tileId, { buildingLevel: 1 });
        break;
      case 'chat_message':
        log(`[${payload.playerName}] ${payload.message}`);
        break;
      case 'error':
        log(`오류: ${payload?.message}`);
        break;
    }
  };
}

// Local mirror of server game session
const gameServerState = { currentPlayerId: null, players: [] };
function syncGameFromServer(state) {
  if (!state) return;
  gameServerState.currentPlayerId = state.currentPlayerId;
  gameServerState.players = state.players || [];
  // Reset local GameState to number of players
  sceneRemovePlayerMeshes();
  gameState.players = [];
  gameState.playerMeshes = [];
  gameState.currentPlayerIndex = 0;
  gameState.initializePlayers(gameServerState.players.length);
  updateTurnUI();
  renderPlayers(gameServerState.players.map(p => ({ id: p.id, name: findName(p.id) })), gameServerState.currentPlayerId);
}
function sceneRemovePlayerMeshes() {
  (gameState.playerMeshes || []).forEach(m => scene.remove(m));
}
function findName(id) { return (id === client.playerId ? (client.name || 'Me') : `Player ${id.slice(0,4)}`); }
function updateTurnUI() {
  if (!ui.rollBtn || !ui.endTurnBtn) return;
  const myTurn = gameServerState.currentPlayerId === client.playerId;
  ui.rollBtn.disabled = !myTurn;
  ui.endTurnBtn.disabled = !myTurn;
  setStatus(myTurn ? '내 턴입니다' : '상대 턴 대기중');
}

// --------- Button handlers ---------
if (ui.createBtn) ui.createBtn.onclick = () => {
  connect();
  client.name = (ui.nickname?.value || 'Player');
  ws.send(JSON.stringify({ type: 'create_room', payload: { playerName: client.name, maxPlayers: 4 } }));
};
if (ui.joinBtn) ui.joinBtn.onclick = () => {
  connect();
  client.name = (ui.nickname?.value || 'Player');
  const rid = (ui.roomId?.value || '').trim();
  if (!rid) { setStatus('방 ID를 입력하세요'); return; }
  ws.send(JSON.stringify({ type: 'join_room', payload: { roomId: rid, playerName: client.name } }));
};
if (ui.leaveBtn) ui.leaveBtn.onclick = () => {
  if (!ws) return; ws.send(JSON.stringify({ type: 'leave_room' })); client.roomId = null; setStatus('방 나감');
};
if (ui.startBtn) ui.startBtn.onclick = () => {
  if (!ws) return; ws.send(JSON.stringify({ type: 'start_game' }));
};
if (ui.rollBtn) ui.rollBtn.onclick = () => {
  if (!ws) return;
  // Ask server to roll; server will broadcast authoritative result
  ws.send(JSON.stringify({ type: 'roll_dice' }));
};
if (ui.endTurnBtn) ui.endTurnBtn.onclick = () => {
  if (!ws) return; ws.send(JSON.stringify({ type: 'end_turn' }));
};

function handleRemoteDice(playerId, diceResult) {
  const isMe = playerId === client.playerId;
  log(`${isMe ? '내' : '상대'} 주사위: ${diceResult.dice[0]} + ${diceResult.dice[1]} = ${diceResult.total}${diceResult.isDouble ? ' (더블)' : ''}`);
  // Animate local dice and move current player locally
  diceRoller.roll(() => {}); // show animation
  // If it's my turn, also move local GameState current player
  // Find player index by turn order mirror
  const localCurrent = gameState.getCurrentPlayer();
  gameState.handleDiceRoll(diceResult);
}

// --------- Render loop ---------
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// --------- Minimal bootstrap UI state ---------
setStatus('서버에 연결하여 방을 생성/참여하세요');
