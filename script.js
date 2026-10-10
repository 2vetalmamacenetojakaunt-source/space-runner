const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const skinNameEl = document.getElementById('skinName');
const sectorNameEl = document.getElementById('sectorName');
const skinMenuEl = document.getElementById('skinMenu');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const leaderboardListEl = document.getElementById('leaderboardList');
const bestScoreEl = document.getElementById('bestScore');
const nicknameForm = document.getElementById('nicknameForm');
const nicknameInput = document.getElementById('nicknameInput');
const powerupStatusEl = document.getElementById('powerupStatus');
const nicknameStorageKey = 'space-runner-nickname';

const state = {
  running: false,
  score: 0,
  lives: 3,
  time: 0,
  paused: false,
  sector: 1,
  sectorNoticeTime: 0,
};

const sectorThemes = [
  { name: 'Орбита Земли', background: '#08111f' },
  { name: 'Пояс астероидов', background: '#171326' },
  { name: 'Туманность', background: '#10202b' },
  { name: 'Синий разлом', background: '#17132a' },
];

const playerSkins = [
  { name: 'Стандарт', body: '#69d2ff', glow: '#dff9ff', wing: '#ffd166' },
  { name: 'Огонь', body: '#ff7b54', glow: '#ffd1a8', wing: '#ffe66d' },
  { name: 'Лёд', body: '#7ee7ff', glow: '#e8fdff', wing: '#a2f6c3' },
  { name: 'Пустота', body: '#b78cff', glow: '#f1e3ff', wing: '#ff9ac8' },
  { name: 'Небо', body: '#88e0ff', glow: '#dff9ff', wing: '#9ce7d1' },
  { name: 'Рубин', body: '#ff667a', glow: '#ffd0d7', wing: '#ffcf70' },
  { name: 'Изумруд', body: '#4bd8a0', glow: '#d9ffef', wing: '#d6eb64' },
  { name: 'Серебро', body: '#cfe3ff', glow: '#f1f5ff', wing: '#9ad9ff' },
  { name: 'Золото', body: '#ffcf52', glow: '#fff2b3', wing: '#ffd166' },
  { name: 'Тёмный', body: '#6f7bf7', glow: '#d6d9ff', wing: '#ff9dc5' },
];

const player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  width: 34,
  height: 34,
  speed: 360,
  skinIndex: 0,
  invuln: 0,
  shieldTime: 0,
};

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const movementKeyByCode = {
  KeyA: 'a',
  KeyD: 'd',
  KeyW: 'w',
  KeyS: 's',
};

const stars = [];
const pickups = [];
const enemies = [];

function renderSkinMenu() {
  if (!skinMenuEl) return;

  skinMenuEl.innerHTML = playerSkins
    .map((skin, index) => {
      const activeClass = index === player.skinIndex ? 'active' : '';
      return `
        <button class="skin-btn ${activeClass}" data-index="${index}" type="button">
          <span class="skin-swatch" style="background:${skin.body}; box-shadow:0 0 14px ${skin.glow};"></span>
          ${skin.name}
        </button>
      `;
    })
    .join('');

  skinMenuEl.querySelectorAll('.skin-btn').forEach((button) => {
    button.addEventListener('click', () => {
      setSkin(Number(button.dataset.index));
    });
  });
}

function setSkin(index) {
  player.skinIndex = (index + playerSkins.length) % playerSkins.length;
  if (skinNameEl) {
    skinNameEl.textContent = playerSkins[player.skinIndex].name;
  }
  renderSkinMenu();
}

function cycleSkin() {
  setSkin(player.skinIndex + 1);
}

function getLeaderboard() {
  try {
    const data = JSON.parse(localStorage.getItem('space-runner-leaderboard') || '[]');
    if (!Array.isArray(data)) return [];

    const realEntries = data.filter((entry) => !['Игрок 1', 'Игрок 2', 'Игрок 3'].includes(entry?.name));
    if (realEntries.length !== data.length) {
      saveLeaderboard(realEntries);
    }
    return realEntries;
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem('space-runner-leaderboard', JSON.stringify(entries));
}

function renderLeaderboard() {
  const entries = getLeaderboard();
  const topFive = entries.slice(0, 5);
  const bestScore = topFive[0]?.score || 0;

  if (bestScoreEl) {
    bestScoreEl.textContent = String(bestScore);
  }

  if (!leaderboardListEl) return;

  if (!topFive.length) {
    leaderboardListEl.innerHTML = '<li><span>Пока пусто</span><span>0</span></li>';
    return;
  }

  leaderboardListEl.replaceChildren(...topFive.map((entry, index) => {
    const item = document.createElement('li');
    item.className = `rank-${index + 1}`;

    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = String(index + 1);

    const name = document.createElement('span');
    name.className = 'leaderboard-name';
    name.textContent = entry.name;

    const score = document.createElement('strong');
    score.textContent = String(entry.score);

    item.append(rank, name, score);
    return item;
  }));
}

function addScoreToLeaderboard(score) {
  if (score <= 0) return;

  const entries = getLeaderboard();
  const name = localStorage.getItem(nicknameStorageKey) || 'Игрок';
  entries.push({ name, score, skin: playerSkins[player.skinIndex].name });
  entries.sort((a, b) => b.score - a.score);
  saveLeaderboard(entries.slice(0, 5));
  renderLeaderboard();
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  state.paused = false;
  state.sector = 1;
  state.sectorNoticeTime = 0;

  if (pauseButton) {
    pauseButton.textContent = 'Пауза';
  }

  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
  player.invuln = 0;
  player.shieldTime = 0;

  stars.length = 0;
  pickups.length = 0;
  enemies.length = 0;

  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 0.8 + 0.3,
    });
  }

  updateHud();
}

function updateHud() {
  const nextSector = Math.floor(state.score / 100) + 1;
  if (nextSector !== state.sector) {
    state.sector = nextSector;
    state.sectorNoticeTime = 2.5;
  }

  scoreEl.textContent = String(state.score);
  livesEl.textContent = String(state.lives);
  if (sectorNameEl) {
    sectorNameEl.textContent = sectorThemes[(state.sector - 1) % sectorThemes.length].name;
  }
  updatePowerupStatus();
}

function updatePowerupStatus() {
  if (!powerupStatusEl) return;

  const label = player.shieldTime > 0 ? `Щит: ${Math.ceil(player.shieldTime)}с` : '';
  if (powerupStatusEl.textContent !== label) {
    powerupStatusEl.textContent = label;
  }
}

function spawnPickup() {
  const roll = Math.random();
  const type = roll < 0.04 ? 'life' : roll < 0.16 ? 'shield' : roll < 0.32 ? 'bonus' : 'score';

  pickups.push({
    x: 40 + Math.random() * (canvas.width - 80),
    y: -20,
    radius: type === 'shield' || type === 'life' ? 12 : type === 'bonus' ? 11 : 9,
    speed: 150 + Math.random() * 80,
    type,
  });
}

function spawnEnemy() {
  const enemyTypes = [
    { kind: 'needle', radius: 14, damage: 1, speed: [180, 270], drift: [40, 100], color: '#ff6b6b', accent: '#ffd0d0' },
    { kind: 'thorn', radius: 18, damage: 2, speed: [200, 310], drift: [50, 120], color: '#ff9f43', accent: '#ffe5b6' },
    { kind: 'crystal', radius: 16, damage: 1, speed: [190, 290], drift: [60, 140], color: '#5ad5ff', accent: '#dff9ff' },
    { kind: 'shard', radius: 20, damage: 2, speed: [180, 260], drift: [45, 110], color: '#ff4d8d', accent: '#ffd6ea' },
    { kind: 'mine', radius: 16, damage: 1, speed: [130, 190], drift: [120, 200], color: '#d5dc50', accent: '#f7ffb0' },
    { kind: 'comet', radius: 13, damage: 1, speed: [290, 390], drift: [80, 150], color: '#ff6a3d', accent: '#ffdd99' },
    { kind: 'crusher', radius: 23, damage: 2, speed: [130, 200], drift: [20, 60], color: '#a06bff', accent: '#e4d2ff' },
  ];

  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const sectorBoost = Math.min(state.sector - 1, 8) * 8;
  const speed = type.speed[0] + sectorBoost + Math.random() * (type.speed[1] - type.speed[0]);
  const drift = (Math.random() - 0.5) * (type.drift[1] - type.drift[0]) + type.drift[0] * (Math.random() > 0.5 ? 1 : -1);

  enemies.push({
    x: 24 + Math.random() * (canvas.width - 48),
    y: -25,
    radius: type.radius,
    speed,
    drift,
    kind: type.kind,
    damage: type.damage,
    color: type.color,
    accent: type.accent,
  });
}

function handleInput(dt) {
  const horizontal = Number(keys.right) - Number(keys.left);
  const vertical = Number(keys.down) - Number(keys.up);
  const magnitude = Math.hypot(horizontal, vertical) || 1;

  player.x += (horizontal / magnitude) * player.speed * dt;
  player.y += (vertical / magnitude) * player.speed * dt;

  player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
  player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
}

function togglePause() {
  if (!state.running) return;

  state.paused = !state.paused;
  if (pauseButton) {
    pauseButton.textContent = state.paused ? 'Продолжить' : 'Пауза';
  }
}

function update(dt) {
  if (!state.running || state.paused) return;

  state.time += dt;
  state.sectorNoticeTime = Math.max(0, state.sectorNoticeTime - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.shieldTime = Math.max(0, player.shieldTime - dt);
  updatePowerupStatus();

  handleInput(dt);

  for (const star of stars) {
    star.y += star.speed * 60 * dt;
    if (star.y > canvas.height + 6) {
      star.y = -5;
      star.x = Math.random() * canvas.width;
    }
  }

  if (Math.random() < 0.75 * dt) {
    spawnPickup();
  }

  const threatLevel = Math.min(state.sector - 1, 8);
  if (Math.random() < (0.8 + threatLevel * 0.12) * dt) {
    spawnEnemy();
  }

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const item = pickups[i];
    item.y += item.speed * dt;

    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const distance = Math.hypot(dx, dy);

    if (distance < player.width / 2 + item.radius) {
      if (item.type === 'shield') {
        player.shieldTime = 5;
      } else if (item.type === 'life') {
        if (state.lives < 5) state.lives += 1;
        else state.score += 25;
      } else {
        state.score += item.type === 'bonus' ? 50 : 10;
      }
      pickups.splice(i, 1);
      updateHud();
      continue;
    }

    if (item.y > canvas.height + 20) {
      pickups.splice(i, 1);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * dt;
    enemy.x += enemy.drift * dt;

    if (enemy.x < 18 || enemy.x > canvas.width - 18) {
      enemy.drift *= -1;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (distance < player.width / 2 + enemy.radius + 2) {
      if (player.shieldTime > 0) {
        enemies.splice(i, 1);
        state.score += 5;
        updateHud();
      } else if (player.invuln <= 0) {
        enemies.splice(i, 1);
        state.lives -= enemy.damage;
        player.invuln = 1.1;
        updateHud();

        if (state.lives <= 0) {
          state.running = false;
          state.paused = false;
          addScoreToLeaderboard(state.score);
          startButton.textContent = 'Играть заново';
          if (pauseButton) {
            pauseButton.textContent = 'Пауза';
          }
        }
      }
      continue;
    }

    if (enemy.y > canvas.height + 30) {
      enemies.splice(i, 1);
    }
  }
}

function drawPlayer() {
  const skin = playerSkins[player.skinIndex];
  const pulse = player.invuln > 0 ? 0.35 + Math.sin(state.time * 20) * 0.35 : 1;
  const flameLength = 12 + Math.sin(state.time * 32) * 5;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalAlpha = pulse;

  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 18;

  const flame = ctx.createLinearGradient(0, 12, 0, 34);
  flame.addColorStop(0, '#fff4b0');
  flame.addColorStop(0.4, skin.wing);
  flame.addColorStop(1, 'rgba(255, 95, 60, 0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 12 + flameLength);
  ctx.lineTo(5, 12);
  ctx.closePath();
  ctx.fill();

  const wingGradient = ctx.createLinearGradient(-19, 0, 19, 15);
  wingGradient.addColorStop(0, skin.wing);
  wingGradient.addColorStop(0.5, skin.body);
  wingGradient.addColorStop(1, skin.wing);
  ctx.fillStyle = wingGradient;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(19, 17);
  ctx.lineTo(9, 13);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.lineTo(-9, 13);
  ctx.lineTo(-19, 17);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = skin.glow;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-15, 12);
  ctx.lineTo(-7, 8);
  ctx.moveTo(15, 12);
  ctx.lineTo(7, 8);
  ctx.stroke();

  const hull = ctx.createLinearGradient(-12, -20, 12, 18);
  hull.addColorStop(0, skin.glow);
  hull.addColorStop(0.35, skin.body);
  hull.addColorStop(1, '#173452');
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(10, 5);
  ctx.lineTo(7, 17);
  ctx.lineTo(0, 13);
  ctx.lineTo(-7, 17);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = '#0a1837';
  ctx.fillRect(-6, 8, 12, 11);
  ctx.fillStyle = skin.wing;
  ctx.fillRect(-3, 12, 6, 5);

  const cockpit = ctx.createLinearGradient(-5, -13, 5, 2);
  cockpit.addColorStop(0, '#ffffff');
  cockpit.addColorStop(0.25, '#bdf6ff');
  cockpit.addColorStop(1, '#1686bb');
  ctx.fillStyle = cockpit;
  ctx.beginPath();
  ctx.ellipse(0, -5, 4.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (player.shieldTime > 0) {
    ctx.strokeStyle = 'rgba(105, 210, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#69d2ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, 27 + Math.sin(state.time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPickup(item) {
  ctx.save();
  const bob = Math.sin(state.time * 4 + item.x * 0.02) * 3;
  ctx.translate(item.x, item.y + bob);
  if (item.type === 'bonus') ctx.rotate(state.time * 1.2);
  ctx.fillStyle = item.type === 'bonus' ? '#ffd166' : item.type === 'life' ? '#ff6b8a' : '#78ffb3';
  ctx.shadowColor = item.type === 'shield' ? '#69d2ff' : ctx.fillStyle;
  ctx.shadowBlur = 18;

  ctx.strokeStyle = item.type === 'shield' ? 'rgba(105, 210, 255, 0.45)' : `${ctx.fillStyle}88`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, item.radius + 5 + Math.sin(state.time * 5) * 1.5, 0, Math.PI * 2);
  ctx.stroke();

  if (item.type === 'shield') {
    ctx.strokeStyle = '#c7f7ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, item.radius - 1, state.time, state.time + Math.PI * 1.65);
    ctx.stroke();
    ctx.fillStyle = '#dffaff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, -4);
    ctx.lineTo(5, 3);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 3);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item.type === 'life') {
    ctx.beginPath();
    ctx.moveTo(0, item.radius * 0.8);
    ctx.bezierCurveTo(-item.radius * 1.5, 0, -item.radius * 0.8, -item.radius, 0, -item.radius * 0.35);
    ctx.bezierCurveTo(item.radius * 0.8, -item.radius, item.radius * 1.5, 0, 0, item.radius * 0.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(-3, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  const points = item.type === 'bonus' ? 10 : 6;
  for (let i = 0; i < points; i += 1) {
    const angle = (Math.PI * 2 * i) / points;
    const radius = i % 2 === 0 ? item.radius : item.radius * 0.58;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, item.type === 'bonus' ? 2.5 : 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const shell = ctx.createRadialGradient(-enemy.radius * 0.3, -enemy.radius * 0.35, enemy.radius * 0.08, 0, 0, enemy.radius * 1.2);
  shell.addColorStop(0, enemy.accent);
  shell.addColorStop(0.38, enemy.color);
  shell.addColorStop(1, '#171426');
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 12;

  if (enemy.kind === 'needle') {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius * 0.8, enemy.radius * 0.9);
    ctx.lineTo(0, enemy.radius * 0.3);
    ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (enemy.kind === 'thorn') {
    ctx.fillStyle = shell;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const inner = i % 2 === 0 ? enemy.radius * 0.5 : enemy.radius;
      const px = Math.cos(angle) * inner;
      const py = Math.sin(angle) * inner;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (enemy.kind === 'crystal') {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, 0);
    ctx.lineTo(0, enemy.radius);
    ctx.lineTo(-enemy.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius * 0.7);
    ctx.lineTo(enemy.radius * 0.35, 0);
    ctx.lineTo(0, enemy.radius * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'comet') {
    ctx.fillStyle = enemy.accent;
    ctx.beginPath();
    ctx.moveTo(-enemy.radius * 0.4, -enemy.radius * 0.3);
    ctx.lineTo(0, -enemy.radius * 2);
    ctx.lineTo(enemy.radius * 0.4, -enemy.radius * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, enemy.radius * 0.25, enemy.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (enemy.kind === 'crusher') {
    ctx.rotate(state.time * 1.8);
    ctx.fillStyle = shell;
    ctx.fillRect(-enemy.radius * 0.75, -enemy.radius * 0.75, enemy.radius * 1.5, enemy.radius * 1.5);
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(-enemy.radius * 0.75, -enemy.radius * 0.75, enemy.radius * 1.5, enemy.radius * 1.5);
    ctx.fillStyle = 'rgba(23, 20, 38, 0.75)';
    ctx.fillRect(-enemy.radius * 0.35, -enemy.radius * 0.35, enemy.radius * 0.7, enemy.radius * 0.7);
  } else {
    ctx.rotate(state.time * 0.8);
    ctx.fillStyle = shell;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI / 4) * i;
      const outer = enemy.radius;
      const inner = enemy.radius * 0.45;
      const px = Math.cos(angle) * (i % 2 === 0 ? outer : inner);
      const py = Math.sin(angle) * (i % 2 === 0 ? outer : inner);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(13, 18, 35, 0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = enemy.accent;
  ctx.beginPath();
  ctx.arc(-enemy.radius * 0.08, -enemy.radius * 0.08, enemy.radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = sectorThemes[(state.sector - 1) % sectorThemes.length].background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(7, 11, 20, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e6f4ff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = '22px Arial';
  ctx.fillText(`Счёт: ${state.score}`, canvas.width / 2, canvas.height / 2 + 35);
}

function render() {
  drawBackground();

  if (state.running) {
    for (const item of pickups) drawPickup(item);
    for (const enemy of enemies) drawEnemy(enemy);
    drawPlayer();

    if (state.paused) {
      ctx.fillStyle = 'rgba(3, 7, 14, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#eaf7ff';
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Пауза', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '20px Arial';
      ctx.fillText('Нажмите Esc или кнопку Пауза', canvas.width / 2, canvas.height / 2 + 30);
    }

    if (state.sectorNoticeTime > 0) {
      const theme = sectorThemes[(state.sector - 1) % sectorThemes.length];
      ctx.fillStyle = 'rgba(3, 7, 14, 0.55)';
      ctx.fillRect(canvas.width / 2 - 180, 24, 360, 52);
      ctx.fillStyle = '#eaf7ff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`СЕКТОР ${state.sector}: ${theme.name}`, canvas.width / 2, 58);
    }
  } else {
    drawGameOver();
  }
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.03);
  lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function setKeyState(normalizedKey, pressed) {
  if (normalizedKey === 'a') keys.left = pressed;
  if (normalizedKey === 'd') keys.right = pressed;
  if (normalizedKey === 'w') keys.up = pressed;
  if (normalizedKey === 's') keys.down = pressed;
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const movementKey = movementKeyByCode[event.code] || key;
  const typing = event.target instanceof HTMLElement && (
    event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
  );

  if (['a', 'd', 'w', 's'].includes(movementKey) && !typing) {
    event.preventDefault();
    setKeyState(movementKey, true);
  }
  if (key === 'c' || event.code === 'KeyC') cycleSkin();
  if (event.key === 'Escape') togglePause();
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  const movementKey = movementKeyByCode[event.code] || key;

  if (['a', 'd', 'w', 's'].includes(movementKey)) {
    event.preventDefault();
    setKeyState(movementKey, false);
  }
});

window.addEventListener('blur', () => {
  keys.left = false;
  keys.right = false;
  keys.up = false;
  keys.down = false;
});

startButton.addEventListener('click', () => {
  resetGame();
  canvas.focus();
  startButton.textContent = 'Игра идёт';
  startButton.disabled = true;
  setTimeout(() => {
    startButton.disabled = false;
    startButton.textContent = 'Начать игру';
  }, 800);
});

pauseButton.addEventListener('click', () => {
  togglePause();
});

nicknameInput.value = localStorage.getItem(nicknameStorageKey) || 'Игрок';
nicknameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const nickname = nicknameInput.value.trim().replace(/\s+/g, ' ');
  if (!nickname) return;

  nicknameInput.value = nickname;
  localStorage.setItem(nicknameStorageKey, nickname);
});

setSkin(0);
renderSkinMenu();
renderLeaderboard();
resetGame();
requestAnimationFrame(gameLoop);
