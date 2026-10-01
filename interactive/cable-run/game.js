const boardElement = document.getElementById('board');
const levelLabel = document.getElementById('level-label');
const lengthLabel = document.getElementById('length-label');
const statusLabel = document.getElementById('status-label');
const objectiveText = document.getElementById('objective-text');
const restartButton = document.getElementById('restart-button');
const nextButton = document.getElementById('next-button');
const connectionDialog = document.getElementById('connection-dialog');

const titleScreen = document.getElementById('title-screen');
const levelSelectScreen = document.getElementById('level-select-screen');
const pauseMenu = document.getElementById('pause-menu');
const gameContainer = document.getElementById('game-container');
const pauseButton = document.getElementById('pause-button');

const btnPlay = document.getElementById('btn-play');
const btnSelectLevel = document.getElementById('btn-select-level');
const btnBackLevels = document.getElementById('btn-back-levels');
const btnResume = document.getElementById('btn-resume');
const btnRestartGame = document.getElementById('btn-restart-game');
const btnLevelSelectPause = document.getElementById('btn-level-select-pause');
const btnTitle = document.getElementById('btn-title');
const levelGrid = document.getElementById('level-grid');

let gameState = 'title';

const BONUS_TYPES = {
  boost: 'boost',
  shield: 'shield',
  rewind: 'rewind'
};
const PLAYER_REPEAT_MS = 150;
const FIBER_BEND_WINDOW = 8;
const FIBER_BEND_LIMIT = 5;
let activeDirection = null;
let nextPlayerMoveAt = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Keep retries consistent within this session without storing an endless level array.
let sessionSeed = Math.floor(Math.random() * 4294967296);
let progressRecords = {};
try {
  const saved = JSON.parse(localStorage.getItem('cable-run-progress-v1'));
  if (saved && Number.isInteger(saved.seed) && saved.seed >= 0 && saved.seed < 4294967296) {
    sessionSeed = saved.seed;
    for (const [key, record] of Object.entries(saved.levels || {})) {
      if (/^\d+$/.test(key) && record && Number.isInteger(record.stars) && record.stars >= 1 && record.stars <= 3 && Number.isFinite(record.score) && record.score >= 0) progressRecords[key] = record;
    }
  }
} catch { /* Play normally when storage is unavailable. */ }
function saveProgress() {
  try { localStorage.setItem('cable-run-progress-v1', JSON.stringify({ seed: sessionSeed, levels: progressRecords })); } catch { /* Session progress remains available. */ }
}
function nextGoalLevel() {
  let index = 0;
  while (progressRecords[index]) index += 1;
  return index;
}
const LEVELS_PER_PAGE = 50;
let levelPage = 0;

function levelRandom(index) {
  let seed = sessionSeed;
  for (const digit of String(index)) {
    seed = Math.imul(seed ^ digit.charCodeAt(0), 16777619) >>> 0;
  }
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createGeneratedLevel(index) {
  const random = levelRandom(index);
  const medium = index % 2 === 0 ? 'copper' : 'fiber';
  // Odd dimensions keep both endpoints on the carved maze lattice.
  const rows = clamp(7 + 2 * Math.floor(index / 5), 7, 19);
  let cols = clamp(9 + 2 * Math.floor(index / 4), 9, 23);
  const start = { x: 1, y: 1 };
  const device = { x: cols - 2, y: rows - 2 };
  let maze;
  const difficulty = index < 5 ? 'Easy' : index < 15 ? 'Medium' : index < 30 ? 'Hard' : 'Expert';
  const progress = Math.min(1, index / 40);
  const minimumLength = cols + rows - 5;
  const mazeCells = ((cols - 1) / 2) * ((rows - 1) / 2);
  // Add a detour immediately on level 2 instead of rounding early levels
  // back down to the introductory route length.
  const earlyDetour = index === 0 ? 0 : 4;
  const targetLength = Math.round(Math.min(mazeCells * 2 - 1,
    minimumLength + earlyDetour + progress * (mazeCells * 1.5 - minimumLength)
    + (index === 0 ? 0 : Math.floor(random() * (index < 6 ? 2 : 4)) * 4)));
  const directions = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }];
  let solutionLength = 1;

  function carve(x, y, distance) {
    maze[y][x] = false;
    if (x === device.x && y === device.y) solutionLength = distance + 1;
    const shuffled = [...directions];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (const dir of shuffled) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && maze[ny][nx]) {
        maze[y + dir.y / 2][x + dir.x / 2] = false;
        carve(nx, ny, distance + 2);
      }
    }
  }
  function findRoute(blockedEdge = null) {
    const queue = [start];
    const parents = new Map([[createCellKey(start), null]]);
    for (let i = 0; i < queue.length; i += 1) {
      const position = queue[i];
      const key = createCellKey(position);
      if (position.x === device.x && position.y === device.y) {
        const route = [];
        for (let step = key; step !== null; step = parents.get(step)) route.push(step);
        return route.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = { x: position.x + dx, y: position.y + dy };
        const nextKey = createCellKey(next);
        if (next.x < 1 || next.y < 1 || next.x >= cols - 1 || next.y >= rows - 1 || maze[next.y][next.x] || parents.has(nextKey)) continue;
        if (blockedEdge && ((key === blockedEdge[0] && nextKey === blockedEdge[1]) || (key === blockedEdge[1] && nextKey === blockedEdge[0]))) continue;
        parents.set(nextKey, key);
        queue.push(next);
      }
    }
    return null;
  }

  // Score completed mazes AFTER adding alternate routes: opening loops can
  // otherwise turn a long winding route into a short direct shortcut.
  let bestMaze;
  let bestRoute;
  let bestDifference = Infinity;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    maze = Array.from({ length: rows }, () => Array(cols).fill(true));
    carve(start.x, start.y, 0);
    const connectors = [];
    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        if (maze[y][x] && ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0))) connectors.push({ x, y });
      }
    }
    for (let i = connectors.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [connectors[i], connectors[j]] = [connectors[j], connectors[i]];
    }
    let shortestRoute;
    for (const { x, y } of connectors) {
      maze[y][x] = false;
      shortestRoute = findRoute();
      // Stop once there are multiple routes to the device. Extra random
      // openings tend to erase the detours that make later levels harder.
      if (shortestRoute.slice(1).some((key, step) => findRoute([shortestRoute[step], key]))) break;
    }
    const difference = Math.abs(shortestRoute.length - targetLength);
    if (difference < bestDifference) {
      bestMaze = maze;
      bestRoute = shortestRoute;
      bestDifference = difference;
    }
    if (difference <= 1) break;
  }
  maze = bestMaze;
  // Alternate the destination's grid parity with a real terminal alcove.
  // Grid paths have fixed parity for their endpoints, so adjacent levels
  // now have different minimum lengths without changing the move counter
  // or depending on retries finding a different random length.
  if (index % 2 === 1) {
    for (const row of maze) row.push(true, true);
    cols += 2;
    device.x += 1;
    maze[device.y][device.x] = false;
    bestRoute.push(createCellKey(device));
  }
  const minimumMoves = bestRoute.length - 1;

  const walls = [];
  const obstacles = [];
  const available = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (maze[y][x]) {
        const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
        // Obstacles replace walls, so they never block the guaranteed route.
        (border || random() > 0.25 ? walls : obstacles).push({ x, y });
      } else if (!(x === start.x && y === start.y) && !(x === device.x && y === device.y)) {
        available.push({ x, y });
      }
    }
  }

  // Exploration mode has no cable budget or required shortest-route score.
  const bonus = index < 3 ? [] : [0.25, 0.6].map((fraction) => {
    const [x, y] = bestRoute[Math.floor((bestRoute.length - 1) * fraction)].split(':').map(Number);
    return { x, y, type: 'repellent' };
  });
  // A trail of packets rewards forward progress; side packets invite exploration.
  const packetPositions = index < 1 ? [] : bestRoute.slice(2, -1).filter((_, i) => i % 3 === 0)
    .map((key) => { const [x, y] = key.split(':').map(Number); return { x, y }; });
  const sidePositions = available.filter((p) => !bestRoute.includes(createCellKey(p)));
  for (let i = 0; index >= 1 && i < 3 && sidePositions.length; i += 1) {
    packetPositions.push(sidePositions.splice(Math.floor(random() * sidePositions.length), 1)[0]);
  }
  for (const p of packetPositions) {
    if (!bonus.some((b) => b.x === p.x && b.y === p.y)) bonus.push({ ...p, type: 'packet' });
  }
  const hazardCount = index < 4 ? 0 : Math.min(10, 2 + Math.floor(index / 3));
  const candidates = available.filter((p) => Math.abs(p.x - start.x) + Math.abs(p.y - start.y) > 3 && !bonus.some((b) => b.x === p.x && b.y === p.y));
  const hazards = [];
  // Include one panel on the main route so the mechanic is encountered.
  const routeKey = bestRoute[Math.floor(bestRoute.length / 2)];
  const routeIndex = hazardCount ? candidates.findIndex((p) => createCellKey(p) === routeKey) : -1;
  if (routeIndex !== -1) hazards.push(candidates.splice(routeIndex, 1)[0]);
  while (hazards.length < hazardCount && candidates.length) {
    hazards.push(candidates.splice(Math.floor(random() * candidates.length), 1)[0]);
  }

  // Pick each spawn directly; sampling every 17th floor tile could leave
  // small rooms with only one rat and no patrol role.
  const spawnPool = available.filter((p) => Math.abs(p.x - start.x) + Math.abs(p.y - start.y) > 3);
  const ratSpawns = [];
  const ratCount = index < 2 ? 0 : index < 6 ? 1 : index < 10 ? 2 : Math.min(4, 3 + Math.floor((index - 10) / 5));
  const ratRoles = index < 6 ? ['chaser'] : index < 10 ? ['chaser', 'patrol'] : ['chaser', 'patrol', 'ambusher', 'patrol'];
  while (ratSpawns.length < ratCount && spawnPool.length) {
    const choice = Math.floor(random() * spawnPool.length);
    ratSpawns.push(spawnPool.splice(choice, 1)[0]);
  }

  return {
    name: `Rack ${index + 1}`,
    cols, rows, start, device, difficulty, medium,
    // Path length includes the starting tile, just like the movement logic.
    minimumMoves,
    lengthLimit: minimumMoves + 1,
    ratSpawns,
    ratRoles,
    obstacles, walls, bonus, hazards
  };
}

let currentLevelIndex = 0;
let state = null;

function createCellKey(position) {
  return `${position.x}:${position.y}`;
}

function inBounds(position, level) {
  return position.x >= 0 && position.x < level.cols && position.y >= 0 && position.y < level.rows;
}

function getLevelMap(level) {
  const map = new Map();
  for (const wall of level.walls) map.set(createCellKey(wall), 'wall');
  for (const obstacle of level.obstacles) map.set(createCellKey(obstacle), 'obstacle');
  for (const bonus of level.bonus || []) map.set(createCellKey({ x: bonus.x, y: bonus.y }), 'bonus');
  return map;
}

function setupBoard(level) {
  const totalCells = level.rows * level.cols;
  boardElement.style.gridTemplateColumns = `repeat(${level.cols}, minmax(0, 1fr))`;
  boardElement.style.aspectRatio = `${level.cols} / ${level.rows}`;
  boardElement.innerHTML = '';

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const cable = document.createElement('span');
    cable.className = 'fiber';
    cable.setAttribute('aria-hidden', 'true');
    cell.appendChild(cable);
    boardElement.appendChild(cell);
  }
}

function resetLevel(index = currentLevelIndex) {
  const level = createGeneratedLevel(index);
  currentLevelIndex = index;
  state = {
    level,
    path: [level.start],
    moves: 0,
    boosters: { drill: index >= 11 ? 2 : 0, conduit: index >= 13 ? 2 : 0 },
    armedBooster: null,
    conduitTiles: new Set(),
    score: 0,
    fiberBendStrain: 0,
    packets: 0,
    combo: 0,
    lastPacketAt: -Infinity,
    rewardUntil: 0,
    rewardText: '',
    integrity: 3,
    elapsed: 0,
    hazardSeenAt: new Map(),
    ratRandom: levelRandom(index + 10000000),
    repellentUntil: 0,
    lastDirection: { x: 1, y: 0 },
    rats: level.ratSpawns.map((p, i) => ({ ...p, role: level.ratRoles[i % level.ratRoles.length], home: { ...p }, waypoint: 0, travel: null, heading: 0, nextMove: 1500, chewStarted: null, cooldownUntil: 0 })),
    explored: new Set(),
    head: { ...level.start },
    status: 'playing',
    map: getLevelMap(level),
    collectedBonus: new Set(),
    power: {
      shield: false,
      boost: false,
      rewind: false
    }
  };

  setupRatSprites();
  levelLabel.textContent = String(index + 1);
  document.getElementById('difficulty-label').textContent = level.difficulty;
  objectiveText.textContent = level.medium === 'copper'
    ? 'Copper work order: reel back quickly, but avoid amber and red surge panels.'
    : 'Fiber work order: surges cannot harm fiber, but five turns in eight cable steps strain it.';
  statusLabel.textContent = 'Running';
  render();
}

function visibleCells() {
  const radius = Math.max(3, 6 - Math.floor(currentLevelIndex / 10));
  const visible = new Set([createCellKey(state.head)]);
  const queue = [{ ...state.head, distance: 0 }];
  for (let i = 0; i < queue.length; i += 1) {
    const position = queue[i];
    if (position.distance >= radius) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: position.x + dx, y: position.y + dy, distance: position.distance + 1 };
      const key = createCellKey(next);
      if (!inBounds(next, state.level) || visible.has(key)) continue;
      visible.add(key);
      const tile = state.map.get(key);
      if (tile !== 'wall' && tile !== 'obstacle') queue.push(next);
    }
  }
  for (const key of visible) state.explored.add(key);
  return visible;
}

// Newly discovered panels always give a safe interval followed by a warning.
function surgePhase(key) {
  const discovered = state.hazardSeenAt.get(key);
  if (discovered === undefined) return 'safe';
  const time = (state.elapsed - discovered) % 6000;
  return time < 2500 ? 'safe' : time < 4500 ? 'warning' : 'active';
}

function render() {
  const { level, path, head, status } = state;
  boardElement.dataset.medium = level.medium;
  document.getElementById('media-label').textContent = level.medium === 'copper' ? 'Copper' : 'Fiber';
  document.getElementById('media-readout').dataset.medium = level.medium;
  document.getElementById('media-trait').textContent = level.medium === 'copper'
    ? 'Bend-tolerant | fast reel | surge-sensitive'
    : 'Surge-resistant | bend-sensitive';
  document.getElementById('bend-risk').textContent = `${Math.min(state.fiberBendStrain, FIBER_BEND_LIMIT)} / ${FIBER_BEND_LIMIT}`;
  document.getElementById('bend-readout').hidden = level.medium !== 'fiber';
  const visible = visibleCells();
  const hazardKeys = new Set(state.level.hazards.map(createCellKey));
  for (const key of hazardKeys) {
    if (visible.has(key) && !state.hazardSeenAt.has(key)) state.hazardSeenAt.set(key, state.elapsed);
  }
  const cells = [...boardElement.children];
  const pathKeys = new Set(path.map(createCellKey));
  const pathIndices = new Map(path.map((position, index) => [createCellKey(position), index]));
  const switchKey = createCellKey(level.start);
  const deviceKey = createCellKey(level.device);

  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      const cellIndex = y * level.cols + x;
      const cell = cells[cellIndex];
      const key = `${x}:${y}`;
      const isHead = head.x === x && head.y === y;
      const isCable = pathKeys.has(key) && !isHead;
      const isSwitch = key === switchKey;
      const isDevice = key === deviceKey;
      const bonus = (level.bonus || []).find((item) => item.x === x && item.y === y);
      const isWall = state.map.get(key) === 'wall';
      const isObstacle = state.map.get(key) === 'obstacle';
      const isBonus = Boolean(bonus) && !state.collectedBonus.has(key);

      cell.className = 'cell';

      const border = x === 0 || y === 0 || x === level.cols - 1 || y === level.rows - 1;
      if (border && isWall) cell.classList.add('room-wall');
      const pathIndex = pathIndices.get(key);
      if (pathIndex !== undefined) {
        for (const neighbor of [path[pathIndex - 1], path[pathIndex + 1]]) {
          if (!neighbor) continue;
          if (neighbor.x < x) cell.classList.add('fiber-left');
          if (neighbor.x > x) cell.classList.add('fiber-right');
          if (neighbor.y < y) cell.classList.add('fiber-up');
          if (neighbor.y > y) cell.classList.add('fiber-down');
        }
      }
      cell.title = isSwitch ? 'Network switch / start' : isDevice ? 'Target device' : isWall || isObstacle ? (border ? 'Room wall' : 'Equipment rack / blocked') : isBonus ? `${bonus.type} module` : isHead ? 'Cable connector' : isCable ? `${level.medium === 'copper' ? 'Copper' : 'Fiber'} cable` : 'Raised floor / open aisle';
      if (state.conduitTiles.has(key)) cell.classList.add('conduit');
      if (isWall) cell.classList.add('wall');
      if (isObstacle) cell.classList.add('obstacle');
      if (isHead) cell.classList.add('head');
      if (isHead && level.medium === 'fiber' && state.fiberBendStrain >= FIBER_BEND_LIMIT - 1) cell.classList.add('bend-warning');
      if (isCable) cell.classList.add('cable');
      if (isSwitch) cell.classList.add('switch');
      if (isDevice) cell.classList.add('device');
      if (isBonus) cell.classList.add('bonus');
      if (bonus && isBonus) cell.dataset.bonusType = bonus.type;
      else delete cell.dataset.bonusType;
      if (hazardKeys.has(key) && (visible.has(key) || state.explored.has(key))) {
        cell.classList.add('surge-panel');
        const phase = visible.has(key) ? surgePhase(key) : 'unknown';
        cell.classList.add(`surge-${phase}`);
        cell.title = `Power surge panel: ${phase === 'unknown' ? 'out of view' : phase}`;
      }
      if (status !== 'won' && !visible.has(key) && !isDevice) {
        if (state.explored.has(key)) cell.classList.add('remembered');
        else {
          cell.className = 'cell unexplored';
          cell.title = 'Unexplored';
        }
      }
    }
  }

  renderRats(visible);
  for (const type of ['drill', 'conduit']) {
    const button = document.getElementById(`booster-${type}`);
    button.textContent = `${type === 'drill' ? 'Drill (F)' : 'Conduit (C)'}: ${state.boosters[type]}`;
    button.hidden = currentLevelIndex < (type === 'drill' ? 11 : 13);
    button.disabled = state.status !== 'playing' || state.boosters[type] === 0;
    button.setAttribute('aria-pressed', String(state.armedBooster === type));
  }
  document.getElementById('reel-button').disabled = state.status !== 'playing' || state.path.length <= 1;
  const goals = starGoals();
  document.getElementById('star-goals').textContent = goals.map((g) => g.label).join(' | ');
  document.getElementById('star-goal-note').textContent = goals.length === 1
    ? 'Connect for 1 star. Meet this bonus goal for 2.'
    : goals.length === 2
      ? 'Connect for 1 star. Meet one goal for 2, or both for 3.'
      : 'Connect for 1 star. Meet one goal for 2, or any two for 3.';
  const totalPackets = state.level.bonus.filter((b) => b.type === 'packet').length;
  document.getElementById('score-label').textContent = String(state.score);
  document.getElementById('packets-label').textContent = `${state.packets} / ${totalPackets}`;
  const reward = document.getElementById('reward-toast');
  reward.textContent = state.elapsed < state.rewardUntil ? state.rewardText : '';
  reward.classList.toggle('show', state.elapsed < state.rewardUntil);
  document.getElementById('repellent-label').textContent = state.elapsed < state.repellentUntil ? `${Math.ceil((state.repellentUntil - state.elapsed) / 1000)}s` : 'Inactive';
  document.getElementById('integrity-label').textContent = `${state.integrity} / 3`;
  lengthLabel.textContent = String(state.moves);
  statusLabel.textContent = status === 'playing' ? 'Running' : status === 'won' ? 'Connected' : 'Failed';

  nextButton.disabled = state.status !== 'won';
  nextButton.textContent = 'Next Level';
  updateMouseHover();
}

function fail(reason) {
  state.status = 'failed';
  objectiveText.textContent = reason;
  render();
  document.getElementById('connection-heading').textContent = 'Connection Lost';
  document.getElementById('result-stars').textContent = '';
  document.getElementById('result-stars').setAttribute('aria-label', 'No stars earned');
  document.getElementById('result-summary').textContent = `${state.packets} packets collected | ${state.moves} steps`;
  document.getElementById('result-efficiency').textContent = '';
  document.getElementById('result-record').textContent = '';
  document.getElementById('result-tip').textContent = reason;
  document.getElementById('btn-connection-next').hidden = true;
  gameState = 'failed';
  connectionDialog.showModal();
}

function starGoals() {
  const total = state.level.bonus.filter((b) => b.type === 'packet').length;
  const packetTarget = Math.ceil(total * 0.6);
  const stepTarget = Math.ceil(state.level.minimumMoves * 1.25);
  const goals = [{ label: `Finish within ${stepTarget} steps`, met: state.moves <= stepTarget }];
  if (currentLevelIndex >= 1) goals.unshift({ label: `Collect ${packetTarget} packets`, met: state.packets >= packetTarget });
  if (currentLevelIndex >= 2) goals.push({ label: 'Finish with 3/3 integrity', met: state.integrity === 3 });
  return goals;
}

function win() {
  document.getElementById('connection-heading').textContent = 'Connection Made';
  document.getElementById('btn-connection-next').hidden = false;
  const total = state.level.bonus.filter((b) => b.type === 'packet').length;
  const goals = starGoals();
  const earnedGoals = goals.filter((goal) => goal.met);
  const stars = 1 + Math.min(2, earnedGoals.length);
  const stepBonus = Math.round(1000 * Math.min(2, state.level.minimumMoves / Math.max(1, state.moves)));
  state.score += 500 + state.integrity * 100 + stepBonus;
  document.getElementById('result-efficiency').textContent = `${state.moves} steps | Original shortest route: ${state.level.minimumMoves} | Efficiency bonus: +${stepBonus}`;
  document.getElementById('result-stars').textContent = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
  document.getElementById('result-stars').setAttribute('aria-label', `${stars} out of 3 stars`);
  document.getElementById('result-summary').textContent = `${state.score} points ? ${state.packets}/${total} packets ? ${state.integrity}/3 integrity`;
  document.getElementById('result-tip').textContent = earnedGoals.length ? `Bonus goals completed: ${earnedGoals.map((g) => g.label).join(' | ')}.${stars < 3 ? ' Complete one more goal for 3 stars.' : ' Three-star connection!'}` : 'Complete any one bonus goal for 2 stars, or any two for 3 stars.';
  const previous = progressRecords[currentLevelIndex];
  progressRecords[currentLevelIndex] = {
    stars: Math.max(stars, previous?.stars || 0),
    score: Math.max(state.score, previous?.score || 0)
  };
  saveProgress();
  document.getElementById('result-record').textContent = !previous || state.score > previous.score ? 'New personal best!' : `Personal best: ${previous.score} points`;
  state.status = 'won';
  statusLabel.textContent = 'Connected';
  objectiveText.textContent = `Connection complete. The ${state.level.name.toLowerCase()} route is live.`;
  render();
  updateMouseHover();
  gameState = 'won';
  connectionDialog.showModal();
}

function collectBonus(nextHead) {
  const bonus = (state.level.bonus || []).find((item) => item.x === nextHead.x && item.y === nextHead.y);
  if (!bonus || state.collectedBonus.has(createCellKey(nextHead))) return;

  state.collectedBonus.add(createCellKey(nextHead));

  if (bonus.type === 'packet') {
    state.combo = state.elapsed - state.lastPacketAt <= 10000 ? Math.min(5, state.combo + 1) : 1;
    state.lastPacketAt = state.elapsed;
    const points = 100 * state.combo;
    state.score += points;
    state.packets += 1;
    state.rewardText = state.combo > 1 ? `${state.combo}x STREAK! +${points}` : `DATA COLLECTED! +${points}`;
    state.rewardUntil = state.elapsed + 1800;
    playTone({ frequency: 500 + state.combo * 100, duration: 0.12, type: 'triangle', volume: 0.03, slide: 120 });
  } else if (bonus.type === 'repellent') {
    state.repellentUntil = state.elapsed + 8000;
    for (const rat of state.rats) rat.chewStarted = null;
    playShieldSound();
    objectiveText.textContent = 'Repellent active for 8 seconds! Rats flee and cannot bite. Power surges are still dangerous.';
  } else if (bonus.type === BONUS_TYPES.boost) {
    playBoostSound();
    state.power.boost = true;
    objectiveText.textContent = 'Boost module active: extra cable slack rewarded.';
  } else if (bonus.type === BONUS_TYPES.shield) {
    playShieldSound();
    state.power.shield = true;
    objectiveText.textContent = 'Shield module active: one collision is ignored.';
  } else if (bonus.type === BONUS_TYPES.rewind) {
    playRewindSound();
    state.power.rewind = true;
    objectiveText.textContent = 'Rewind module active: you can retrace one step.';
  }
}

const audioState = {
  context: null,
  masterGain: null,
  enabled: true
};

try {
  audioState.enabled = localStorage.getItem('cable-run-sound') !== 'off';
} catch {
  // Sound still works when browser storage is unavailable.
}

const soundButtons = document.querySelectorAll('.sound-toggle');
function updateSoundButtons() {
  soundButtons.forEach((button) => {
    button.textContent = audioState.enabled ? 'Sound: On' : 'Sound: Off';
    button.setAttribute('aria-pressed', String(audioState.enabled));
  });
}

soundButtons.forEach((button) => button.addEventListener('click', () => {
  audioState.enabled = !audioState.enabled;
  if (audioState.masterGain) {
    audioState.masterGain.gain.setValueAtTime(audioState.enabled ? 1 : 0, audioState.context.currentTime);
  }
  if (audioState.enabled) ensureAudio();
  updateSoundButtons();
  try {
    localStorage.setItem('cable-run-sound', audioState.enabled ? 'on' : 'off');
  } catch {
    // Keep the preference for this session if storage is blocked.
  }
}));
updateSoundButtons();

function ensureAudio() {
  if (!audioState.enabled) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  if (!audioState.context) {
    audioState.context = new AudioCtor();
    audioState.masterGain = audioState.context.createGain();
    audioState.masterGain.connect(audioState.context.destination);
  }

  if (audioState.context.state === 'suspended') {
    audioState.context.resume().catch(() => {});
  }

}

function playTone({ frequency = 220, duration = 0.08, type = 'sine', volume = 0.03, slide = 0 } = {}) {
  if (!audioState.enabled || !audioState.context) return;

  const oscillator = audioState.context.createOscillator();
  const gainNode = audioState.context.createGain();
  const now = audioState.context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slide) {
    oscillator.frequency.linearRampToValueAtTime(frequency + slide, now + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioState.masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playMoveSound() {
  ensureAudio();
  playTone({ frequency: 420, duration: 0.06, type: 'triangle', volume: 0.025, slide: 50 });
}

function playBoostSound() {
  ensureAudio();
  playTone({ frequency: 680, duration: 0.04, type: 'square', volume: 0.032, slide: 240 });
  setTimeout(() => playTone({ frequency: 760, duration: 0.04, type: 'square', volume: 0.03, slide: 260 }), 35);
}

function playShieldSound() {
  ensureAudio();
  playTone({ frequency: 440, duration: 0.14, type: 'sine', volume: 0.03, slide: 60 });
  setTimeout(() => playTone({ frequency: 380, duration: 0.08, type: 'sine', volume: 0.025, slide: 40 }), 80);
}

function playRewindSound() {
  ensureAudio();
  playTone({ frequency: 580, duration: 0.08, type: 'triangle', volume: 0.03, slide: -200 });
  setTimeout(() => playTone({ frequency: 420, duration: 0.06, type: 'triangle', volume: 0.028, slide: -140 }), 70);
}

function playFailSound() {
  ensureAudio();
  playTone({ frequency: 180, duration: 0.15, type: 'sawtooth', volume: 0.035, slide: -140 });
}

function playWinSound() {
  ensureAudio();
  playTone({ frequency: 640, duration: 0.08, type: 'triangle', volume: 0.032, slide: 160 });
  setTimeout(() => playTone({ frequency: 820, duration: 0.1, type: 'triangle', volume: 0.03, slide: 180 }), 80);
}

function isMoveAllowed(nextHead) {
  if (!inBounds(nextHead, state.level)) return false;

  const nextKey = createCellKey(nextHead);
  if (state.map.get(nextKey) === 'wall' || state.map.get(nextKey) === 'obstacle') return false;

  const previous = state.path[state.path.length - 2];
  if (previous && previous.x === nextHead.x && previous.y === nextHead.y) return true;
  return !state.path.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
}

function getFiberBendStrain(path) {
  let previousDirection = null;
  let strain = 0;
  const firstEdge = Math.max(1, path.length - FIBER_BEND_WINDOW);
  for (let index = firstEdge; index < path.length; index += 1) {
    const direction = {
      x: path[index].x - path[index - 1].x,
      y: path[index].y - path[index - 1].y
    };
    if (previousDirection) {
      if (direction.x !== previousDirection.x || direction.y !== previousDirection.y) strain += 1;
    }
    previousDirection = direction;
  }
  return strain;
}

function updateMouseHover() {
  const cells = [...boardElement.children];

  cells.forEach((cell) => {
    cell.classList.remove('valid-move');
  });

  if (state.status !== 'playing') return;

  cells.forEach((cell, index) => {
    const cols = state.level.cols;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const target = { x: col, y: row };

    if (Math.abs(target.x - state.head.x) + Math.abs(target.y - state.head.y) !== 1) return;
    if (isMoveAllowed(target)) {
      cell.classList.add('valid-move');
    }
  });
}

function armBooster(type) {
  if (gameState !== 'playing' || state.status !== 'playing' || !state.boosters[type]) return;
  state.armedBooster = state.armedBooster === type ? null : type;
  objectiveText.textContent = state.armedBooster ? `${type === 'drill' ? 'Drill' : 'Conduit'} ready: choose a direction. Press its button again to cancel.` : 'Booster canceled.';
  render();
}
for (const type of ['drill', 'conduit']) {
  document.getElementById(`booster-${type}`).addEventListener('click', () => armBooster(type));
}
document.getElementById('reel-button').addEventListener('click', reelCable);

function moveBy(dx, dy) {
  if (state.status !== 'playing') return;
  const next = { x: state.head.x + dx, y: state.head.y + dy };
  if (state.armedBooster === 'drill') {
    const key = createCellKey(next);
    const tile = state.map.get(key);
    const interior = next.x > 0 && next.y > 0 && next.x < state.level.cols - 1 && next.y < state.level.rows - 1;
    if (!interior || (tile !== 'wall' && tile !== 'obstacle')) {
      objectiveText.textContent = 'Aim the drill at an adjacent interior wall or rack. Outer walls cannot be drilled.';
      return;
    }
    state.map.delete(key);
    state.boosters.drill -= 1;
    state.armedBooster = null;
  } else if (state.armedBooster === 'conduit') {
    if (!isMoveAllowed(next)) {
      objectiveText.textContent = 'Conduit needs an open aisle. Choose another direction or cancel it.';
      return;
    }
    state.boosters.conduit -= 1;
    state.armedBooster = null;
    for (let i = 0; i < 3 && state.status === 'playing'; i += 1) {
      const destination = { x: state.head.x + dx, y: state.head.y + dy };
      if (!isMoveAllowed(destination)) break;
      state.conduitTiles.add(createCellKey(destination));
      moveStep(dx, dy, i === 0);
    }
    return;
  }
  moveStep(dx, dy);
}

function moveStep(dx, dy, countStep = true) {
  if (state.status !== 'playing') return;

  const nextHead = { x: state.head.x + dx, y: state.head.y + dy };

  if (!isMoveAllowed(nextHead)) {
    objectiveText.textContent = 'Blocked aisle. Try another direction or backtrack along your cable.';
    return;
  }

  const previous = state.path[state.path.length - 2];
  const reeling = previous && previous.x === nextHead.x && previous.y === nextHead.y;
  const previousBendStrain = state.fiberBendStrain;
  if (reeling) {
    state.path.pop();
  } else {
    state.path.push(nextHead);
  }
  if (state.level.medium === 'fiber') state.fiberBendStrain = getFiberBendStrain(state.path);
  state.head = nextHead;
  if (countStep) state.moves += 1;
  state.lastDirection = { x: dx, y: dy };
  playMoveSound();
  objectiveText.textContent = 'Find the orange exit port. Wait for red surge panels to cool before crossing.';
  const key = createCellKey(nextHead);
  const panelPhase = surgePhase(key);
  const onSurgePanel = state.level.hazards.some((panel) => createCellKey(panel) === key);
  if (onSurgePanel && panelPhase !== 'safe' && !state.conduitTiles.has(key)) {
    if (state.level.medium === 'copper') {
      if (!damageCable('Copper interference!', 'Connection Failed: copper integrity depleted by power surges. Restart to try again.')) return;
    } else {
      objectiveText.textContent = 'Fiber insulation holds against the surge.';
    }
  }

  if (!reeling && state.level.medium === 'fiber') {
    if (state.fiberBendStrain >= FIBER_BEND_LIMIT && previousBendStrain < FIBER_BEND_LIMIT) {
      if (!damageCable('Fiber bend strain!', 'Connection Failed: repeated tight bends broke the fiber run. Restart to try again.')) return;
      state.rewardText = 'TIGHT BENDS! -1 INTEGRITY';
      state.rewardUntil = state.elapsed + 1800;
    } else if (state.fiberBendStrain === FIBER_BEND_LIMIT - 1 && previousBendStrain < state.fiberBendStrain) {
      objectiveText.textContent = 'Fiber bend risk rising. One more recent turn will strain the run.';
    }
  }

  collectBonus(nextHead);

  if (nextHead.x === state.level.device.x && nextHead.y === state.level.device.y) {
    playWinSound();
    win();
    return;
  }

  render();
  updateMouseHover();
}

function damageCable(reason, failureReason) {
  state.integrity -= 1;
  state.combo = 0;
  state.lastPacketAt = -Infinity;
  playFailSound();
  if (state.integrity === 0) {
    fail(failureReason);
    return false;
  }
  objectiveText.textContent = `${reason} Integrity: ${state.integrity} / 3.`;
  return true;
}

function handleKey(event) {
  const key = event.key.toLowerCase();
  const map = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
    arrowright: [1, 0],
    d: [1, 0],
    r: 'rewind',
    f: 'drill',
    c: 'conduit'
  };

  if (!map[key]) return;

  event.preventDefault();

  if (map[key] === 'drill' || map[key] === 'conduit') {
    if (!event.repeat) armBooster(map[key]);
    return;
  }

  if (map[key] === 'rewind') {
    if (!event.repeat) reelCable();
    return;
  }

  const [dx, dy] = map[key];
  if (!event.repeat) beginDirection(dx, dy);
}

function reelCable() {
  if (gameState !== 'playing' || state.status !== 'playing' || state.path.length <= 1) return;
  state.armedBooster = null;
  const reelSteps = state.level.medium === 'copper' ? 2 : 1;
  for (let step = 0; step < reelSteps && state.path.length > 1 && state.status === 'playing'; step += 1) {
    const previous = state.path[state.path.length - 2];
    moveBy(previous.x - state.head.x, previous.y - state.head.y);
  }
}

function beginDirection(dx, dy) {
  if (gameState !== 'playing' || state.status !== 'playing') return;
  activeDirection = { x: dx, y: dy };
  moveBy(dx, dy);
  nextPlayerMoveAt = state.elapsed + PLAYER_REPEAT_MS;
}

function endDirection(dx, dy) {
  if (activeDirection?.x === dx && activeDirection?.y === dy) activeDirection = null;
}

function showScreen(screenId) {
  lastSurgeTick = performance.now();
  if (screenId !== 'game') activeDirection = null;
  if (connectionDialog.open) connectionDialog.close();
  titleScreen.classList.remove('active');
  levelSelectScreen.classList.remove('active');
  pauseMenu.classList.remove('active');
  gameContainer.style.display = 'none';

  if (screenId === 'title') {
    titleScreen.classList.add('active');
    const stars = Object.values(progressRecords).reduce((sum, r) => sum + r.stars, 0);
    document.getElementById('campaign-progress').textContent = `${Object.keys(progressRecords).length} rooms connected | ${stars} stars | Next goal: Level ${nextGoalLevel() + 1}`;
    btnPlay.textContent = nextGoalLevel() ? `Continue: Level ${nextGoalLevel() + 1}` : 'Play';
    gameState = 'title';
  } else if (screenId === 'levelSelect') {
    levelSelectScreen.classList.add('active');
    gameState = 'levelSelect';
    levelPage = Math.floor(currentLevelIndex / LEVELS_PER_PAGE);
    populateLevelGrid();
  } else if (screenId === 'pause') {
    pauseMenu.classList.add('active');
    gameState = 'paused';
  } else if (screenId === 'game') {
    gameContainer.style.display = null;
    gameState = 'playing';
  }
}

function populateLevelGrid() {
  levelGrid.innerHTML = '';
  const first = levelPage * LEVELS_PER_PAGE;
  for (let i = first; i < first + LEVELS_PER_PAGE; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-btn';
    const record = progressRecords[i];
    btn.textContent = record ? `${i + 1} ${'\u2605'.repeat(record.stars)}` : String(i + 1);
    if (record) btn.classList.add('completed');
    btn.title = record ? `Best: ${record.score} points | ${record.stars}/3 stars` : `Level ${i + 1}`;
    btn.onclick = () => {
      startLevel(i);
    };
    levelGrid.appendChild(btn);
  }
  document.getElementById('level-page-label').textContent = `${first + 1} - ${first + LEVELS_PER_PAGE}`;
  document.getElementById('btn-prev-page').disabled = levelPage === 0;
}

document.getElementById('btn-prev-page').addEventListener('click', () => {
  levelPage = Math.max(0, levelPage - 1);
  populateLevelGrid();
});
document.getElementById('btn-next-page').addEventListener('click', () => {
  levelPage += 1;
  populateLevelGrid();
});

function startLevel(index) {
  setupBoard(createGeneratedLevel(index));
  resetLevel(index);
  showScreen('game');
}

btnPlay.addEventListener('click', () => {
  startLevel(nextGoalLevel());
});

btnSelectLevel.addEventListener('click', () => {
  showScreen('levelSelect');
});

btnBackLevels.addEventListener('click', () => {
  showScreen('title');
});

pauseButton.addEventListener('click', () => {
  if (gameState === 'playing') {
    showScreen('pause');
  }
});

btnResume.addEventListener('click', () => {
  showScreen('game');
});

btnRestartGame.addEventListener('click', () => {
  resetLevel(currentLevelIndex);
  showScreen('game');
});

btnLevelSelectPause.addEventListener('click', () => {
  showScreen('levelSelect');
});

btnTitle.addEventListener('click', () => {
  showScreen('title');
});

restartButton.addEventListener('click', () => {
  resetLevel(currentLevelIndex);
});

function advanceLevel() {
  if (state.status === 'won') {
    const nextIndex = currentLevelIndex + 1;
    startLevel(nextIndex);
  }
}

nextButton.addEventListener('click', advanceLevel);
document.getElementById('btn-connection-next').addEventListener('click', advanceLevel);
document.getElementById('btn-connection-restart').addEventListener('click', () => {
  startLevel(currentLevelIndex);
});
connectionDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && gameState === 'playing') {
    showScreen('pause');
  } else if (gameState === 'playing') {
    handleKey(event);
  }
});
document.addEventListener('keyup', (event) => {
  const directions = {
    arrowup: [0, -1], w: [0, -1],
    arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0],
    arrowright: [1, 0], d: [1, 0]
  };
  const direction = directions[event.key.toLowerCase()];
  if (direction) endDirection(...direction);
});
window.addEventListener('blur', () => { activeDirection = null; });

document.querySelectorAll('.touch-controls button').forEach((button) => {
  const dx = Number(button.dataset.dx);
  const dy = Number(button.dataset.dy);
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    beginDirection(dx, dy);
  });
  button.addEventListener('pointerup', () => endDirection(dx, dy));
  button.addEventListener('pointercancel', () => endDirection(dx, dy));
});

boardElement.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || !state || state.status !== 'playing') return;

  const cells = [...boardElement.children];
  const index = cells.indexOf(cell);
  if (index === -1) return;

  const cols = state.level.cols;
  const row = Math.floor(index / cols);
  const col = index % cols;

  const dx = col - state.head.x;
  const dy = row - state.head.y;

  if (Math.abs(dx) + Math.abs(dy) !== 1) return;
  moveBy(dx, dy);
});

function setupRatSprites() {
  const layer = document.getElementById('rat-layer');
  layer.innerHTML = '';
  for (const rat of state.rats) {
    const sprite = document.createElement('div');
    sprite.className = 'rat-sprite';
    sprite.style.width = `${100 / state.level.cols}%`;
    sprite.style.height = `${100 / state.level.rows}%`;
    // Top-down rat silhouette, facing right, with ears, snout and a long tail.
    sprite.innerHTML = `<svg viewBox="0 0 100 80" class="rat-body" xmlns="http://www.w3.org/2000/svg">
      <path class="rat-tail" d="M35 43 C18 58 4 25 8 16" fill="none" stroke="#b78c89" stroke-width="4" stroke-linecap="round"/>
      <g class="rat-feet" fill="#c59c97"><ellipse cx="44" cy="23" rx="8" ry="4"/><ellipse cx="44" cy="57" rx="8" ry="4"/><ellipse cx="67" cy="25" rx="7" ry="3"/><ellipse cx="67" cy="55" rx="7" ry="3"/></g>
      <ellipse class="rat-fur" cx="49" cy="40" rx="24" ry="18" fill="#655d55" stroke="#302c29" stroke-width="2"/>
      <ellipse class="rat-highlight" cx="50" cy="36" rx="18" ry="11" fill="#877c6d"/>
      <path class="rat-fur" d="M65 27 Q80 29 90 40 Q80 51 65 53Z" fill="#7b7065" stroke="#403832" stroke-width="1.5"/>
      <circle cx="67" cy="27" r="7" fill="#a58e86" stroke="#554841" stroke-width="2"/><circle cx="67" cy="53" r="7" fill="#a58e86" stroke="#554841" stroke-width="2"/>
      <circle cx="79" cy="34" r="2.5" fill="#100e0d"/><circle cx="79" cy="46" r="2.5" fill="#100e0d"/>
      <circle cx="90" cy="40" r="3" fill="#ce9b98"/>
      <path d="M85 37 L97 30 M85 39 L99 37 M85 43 L97 50 M85 41 L99 44" stroke="#d5c6b4" stroke-width="1"/>
    </svg><span class="rat-role-label">${rat.role === 'chaser' ? 'C' : rat.role === 'patrol' ? 'P' : 'A'}</span>`;
    layer.appendChild(sprite);
  }
}

function renderRats(visible) {
  const sprites = document.getElementById('rat-layer').children;
  state.rats.forEach((rat, index) => {
    const sprite = sprites[index];
    const travel = rat.travel;
    const progress = travel ? Math.min(1, (state.elapsed - travel.started) / travel.duration) : 0;
    const x = travel ? rat.x + (travel.x - rat.x) * progress : rat.x;
    const y = travel ? rat.y + (travel.y - rat.y) * progress : rat.y;
    const shown = state.status === 'won' || visible.has(createCellKey({ x: Math.round(x), y: Math.round(y) }));
    sprite.style.left = `${(x + 0.5) * 100 / state.level.cols}%`;
    sprite.style.top = `${(y + 0.5) * 100 / state.level.rows}%`;
    sprite.style.visibility = shown ? 'visible' : 'hidden';
    sprite.style.setProperty('--heading', `${rat.heading}deg`);
    sprite.className = `rat-sprite rat-${rat.role}${state.elapsed < state.repellentUntil ? ' frightened' : ''}${travel ? ' scurrying' : ''}${rat.chewStarted !== null ? ' chewing' : ''}`;
  });
}

function chooseRatStep(rat, options) {
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  let goal = state.head;
  const fleeing = state.elapsed < state.repellentUntil;
  if (!fleeing && rat.role === 'patrol') {
    const corners = [[-3, -3], [3, -3], [3, 3], [-3, 3]];
    const waypoint = () => ({
      x: clamp(rat.home.x + corners[rat.waypoint][0], 0, state.level.cols - 1),
      y: clamp(rat.home.y + corners[rat.waypoint][1], 0, state.level.rows - 1)
    });
    goal = waypoint();
    if (distance(rat, goal) <= 1) {
      rat.waypoint = (rat.waypoint + 1) % corners.length;
      goal = waypoint();
    }
  } else if (!fleeing && rat.role === 'ambusher') {
    goal = {
      x: clamp(state.head.x + state.lastDirection.x * 4, 0, state.level.cols - 1),
      y: clamp(state.head.y + state.lastDirection.y * 4, 0, state.level.rows - 1)
    };
  } else if (!fleeing && rat.role === 'chaser') {
    // Acquire the nearest exposed cable, then follow the run toward its tip.
    const nearest = state.path.slice(1).reduce((best, p) => distance(rat, p) < distance(rat, best) ? p : best, state.head);
    goal = distance(rat, nearest) > 1 ? nearest : state.head;
  }
  const scores = options.map((p) => distance(p, goal) * (fleeing ? -1 : 1));
  const bestScore = Math.min(...scores);
  const best = options.filter((_, i) => scores[i] === bestScore);
  return best[Math.floor(state.ratRandom() * best.length)];
}

function updateRats() {
  const visible = visibleCells();
  const cable = new Set(state.path.slice(1).map(createCellKey));
  for (const rat of state.rats) {
    if (rat.travel) {
      if (state.elapsed - rat.travel.started < rat.travel.duration) continue;
      rat.x = rat.travel.x;
      rat.y = rat.travel.y;
      rat.travel = null;
    }
    const key = createCellKey(rat);
    // Only a visible rat can start or finish a bite: fog never hides damage.
    const canChew = state.elapsed >= state.repellentUntil && cable.has(key) && !state.conduitTiles.has(key) && visible.has(key) && state.elapsed >= rat.cooldownUntil;
    if (canChew) {
      if (rat.chewStarted === null) {
        rat.chewStarted = state.elapsed;
        objectiveText.textContent = 'Rat chewing your cable! Backtrack to reel in that segment before it bites.';
      } else if (state.elapsed - rat.chewStarted >= 2000) {
        rat.chewStarted = null;
        rat.cooldownUntil = state.elapsed + 5000;
        state.integrity -= 1;
    state.combo = 0;
    state.lastPacketAt = -Infinity;
        playFailSound();
        if (state.integrity === 0) {
          fail('Connection Failed: rats chewed through the cable. Restart to try again.');
          return;
        }
        objectiveText.textContent = `Rat bite! Cable integrity: ${state.integrity} / 3. Avoid the rats or reel in threatened cable.`;
      }
      continue;
    }
    rat.chewStarted = null;
    if (state.elapsed < rat.nextMove) continue;
    rat.nextMove = state.elapsed + Math.max(650, 1200 - currentLevelIndex * 15);
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: rat.x + dx, y: rat.y + dy })).filter((p) => {
      return inBounds(p, state.level)
        && createCellKey(p) !== createCellKey(state.level.start)
        && createCellKey(p) !== createCellKey(state.level.device)
        && !state.rats.some((other) => other !== rat && other.x === p.x && other.y === p.y);
    });
    if (options.length) {
      const target = chooseRatStep(rat, options);
      rat.heading = Math.atan2(target.y - rat.y, target.x - rat.x) * 180 / Math.PI;
      rat.travel = { ...target, started: state.elapsed, duration: Math.max(450, 900 - currentLevelIndex * 12) };
    }
  }
}

document.getElementById('btn-result-title').addEventListener('click', () => showScreen('title'));

function initialize() {
  showScreen('title');
}

let lastSurgeTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const delta = Math.min(250, now - lastSurgeTick);
  lastSurgeTick = now;
  if (!state || gameState !== 'playing' || state.status !== 'playing' || document.hidden) return;
  state.elapsed += delta;
  if (activeDirection && state.elapsed >= nextPlayerMoveAt) {
    nextPlayerMoveAt = state.elapsed + PLAYER_REPEAT_MS;
    moveBy(activeDirection.x, activeDirection.y);
  }
  updateRats();
  render();
}, 50);

initialize();
