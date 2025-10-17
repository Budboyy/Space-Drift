const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// ==== Player ====
let player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 80,
  width: 40,
  height: 40,
  speed: 8,
  cooldown: 0,
  fireRate: 25,
  bulletCount: 1,
  hp: 2, // mulai dengan 3 HP
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let boss = null;
let score = 0;
let touchX = null;
let bossHPBase = 5;
let bossLevel = 1;
let bossSpawnInterval = 2000; // Boss spawn setiap 2000 score
let gameFrame = 0;
// persistent trackers for upgrades (must be outside update so they don't reset each frame)
let lastHpUpgradeScore = 0;
let lastBulletUpgradeScore = 0;

// ==== Background bintang ====
let stars = [];
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: 1 + Math.random() * 2,
    size: 2,
  });
}

// ==== Kontrol sentuh ====
canvas.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  touchX = touch.clientX;
});

// ==== Gambar player & boss ====
const playerImg = new Image();
playerImg.src = "player.png";

const bossImg = new Image();
bossImg.src = "boss.png";

// ==== Gambar musuh ====
const enemyImg = new Image();
enemyImg.src = "enemies.png"; // file image untuk musuh biasa

// ==== Fungsi tembak player ====
function shoot() {
  if (player.cooldown <= 0) {
    if (player.bulletCount === 1) {
      bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 12,
        speed: 10,
      });
    } else if (player.bulletCount >= 2) {
      bullets.push(
        { x: player.x + 8, y: player.y, width: 6, height: 12, speed: 10 },
        {
          x: player.x + player.width - 14,
          y: player.y,
          width: 6,
          height: 12,
          speed: 10,
        }
      );
    }
    player.cooldown = player.fireRate;
  }
}

// ==== Spawn musuh ====
function spawnEnemy() {
  enemies.push({
    x: Math.random() * (canvas.width - 40),
    y: -40,
    width: 40,
    height: 40,
    speed: 2 + Math.random() * 2,
    cooldown: 80 + Math.random() * 60,
  });
}

// ==== Spawn boss ====
function spawnBoss() {
  boss = {
    x: canvas.width / 2 - 60,
    y: 80,
    width: 120,
    height: 80,
    dx: 3 + bossLevel * 0.5,
    hp: bossHPBase,
    cooldown: 40 - bossLevel * 2,
    bulletSpeed: 7 + bossLevel * 0.5,
  };
  bossHPBase *= 2;
  bossLevel++;
}

// ==== Update game ====
function update() {
  gameFrame++;

  // Background bintang
  stars.forEach((s) => {
    s.y += s.speed;
    if (s.y > canvas.height) s.y = 0;
  });

  // Player movement
  if (touchX !== null) {
    if (touchX < player.x) player.x -= player.speed;
    else if (touchX > player.x + player.width) player.x += player.speed;
  }
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  if (player.cooldown > 0) player.cooldown--;
  shoot();

  // Peluru player
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed;
    if (bullets[i].y < -bullets[i].height) bullets.splice(i, 1);
  }

  // Peluru musuh - movement and removal
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].y += enemyBullets[i].speed;
    // remove if off-screen
    if (enemyBullets[i].y > canvas.height + enemyBullets[i].height) {
      enemyBullets.splice(i, 1);
    }
  }

  // Musuh biasa
  for (let i = enemies.length - 1; i >= 0; i--) {
    let en = enemies[i];
    en.y += en.speed;
    en.cooldown--;
    if (en.cooldown <= 0) {
      enemyBullets.push({
        x: en.x + en.width / 2 - 3,
        y: en.y + en.height,
        width: 6,
        height: 12,
        speed: 6,
      });
      en.cooldown = 80 + Math.random() * 60;
    }
    if (en.y > canvas.height) enemies.splice(i, 1);
  }

  // Boss
  if (boss) {
    boss.x += boss.dx;
    if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.dx *= -1;
    boss.cooldown--;
    if (boss.cooldown <= 0) {
      for (let i = -1; i <= 1; i++) {
        enemyBullets.push({
          x: boss.x + boss.width / 2 + i * 20,
          y: boss.y + boss.height,
          width: 6,
          height: 14,
          speed: boss.bulletSpeed,
        });
      }
      boss.cooldown = 40 - bossLevel * 2;
    }
  }

  // HP upgrade every 1000 score (use persistent tracker so it only triggers once per threshold)
  if (score - lastHpUpgradeScore >= 1000) {
    // increment as many times as thresholds crossed (in case score jumps)
    const times = Math.floor((score - lastHpUpgradeScore) / 1000);
    player.hp += times;
    lastHpUpgradeScore += times * 1000;
  }

  // Tabrakan peluru musuh dengan player
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let eb = enemyBullets[i];
    if (
      eb.x < player.x + player.width &&
      eb.x + eb.width > player.x &&
      eb.y < player.y + player.height &&
      eb.y + eb.height > player.y
    ) {
      player.hp--;
      enemyBullets.splice(i, 1); // peluru hilang
      if (player.hp <= 0) {
        // Player mati → reset game atau stop loop
        alert(`Game Over! Score: ${score}`);
        document.location.reload();
        return;
      }
    }
  }

  // Tabrakan peluru player
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    let b = bullets[bi];

    // Musuh biasa
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      let en = enemies[ei];
      if (
        b.x < en.x + en.width &&
        b.x + b.width > en.x &&
        b.y < en.y + en.height &&
        b.y + b.height > en.y
      ) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 100;
        break;
      }
    }

    // Boss
    if (
      boss &&
      b.x < boss.x + boss.width &&
      b.x + b.width > boss.x &&
      b.y < boss.y + boss.height &&
      b.y + b.height > boss.y
    ) {
      bullets.splice(bi, 1);
      boss.hp--;
      if (boss.hp <= 0) {
        boss = null;
        score += 1000;
        player.fireRate = Math.max(5, player.fireRate - 2);
      }
    }
  }

  // Upgrade peluru player setiap 10000 skor (use persistent tracker)
  if (score - lastBulletUpgradeScore >= 10000) {
    const times = Math.floor((score - lastBulletUpgradeScore) / 10000);
    player.bulletCount += times;
    lastBulletUpgradeScore += times * 10000;
  }

  // Spawn boss: only spawn when crossing a multiple of bossSpawnInterval
  if (!boss && bossSpawnInterval > 0) {
    const prevThreshold = Math.floor((score - 1) / bossSpawnInterval);
    const curThreshold = Math.floor(score / bossSpawnInterval);
    if (score > 0 && curThreshold > prevThreshold) {
      // don't clear existing enemies; allow normal enemies to coexist with boss
      spawnBoss();
    }
  }

  // ==== Render ====
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  stars.forEach((s) => ctx.fillRect(s.x, s.y, s.size, s.size));

  // Player
  ctx.drawImage(
    playerImg,
    player.x - 1,
    player.y - 20,
    player.width,
    player.height
  );

  // Peluru player
  ctx.fillStyle = "#22d3ee";
  bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.width, b.height));

  // Musuh (gambar jika tersedia, fallback ke kotak merah)
  enemies.forEach((en) => {
    if (enemyImg && enemyImg.complete && enemyImg.naturalWidth !== 0) {
      ctx.drawImage(enemyImg, en.x - 1, en.y - 8, en.width, en.height);
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(en.x, en.y, en.width, en.height);
    }
  });

  // Boss
  if (boss) {
    ctx.drawImage(bossImg, boss.x - 1, boss.y - 20, boss.width, boss.height);
    ctx.fillStyle = "#fff";
    ctx.fillText(`HP: ${boss.hp}`, boss.x + boss.width / 2 - 15, boss.y - 10);
  }

  // Peluru musuh
  ctx.fillStyle = "#facc15";
  enemyBullets.forEach((eb) => ctx.fillRect(eb.x, eb.y, eb.width, eb.height));

  // Skor
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`FireRate: ${player.fireRate}`, 20, 70);
  ctx.fillText(`Weapon: x${player.bulletCount}`, 20, 100);

  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`FireRate: ${player.fireRate}`, 20, 70);
  ctx.fillText(`Weapon: x${player.bulletCount}`, 20, 100);
  ctx.fillText(`HP: ${player.hp}`, 20, 130); // tampilkan HP
}

function loop() {
  update();
  requestAnimationFrame(loop);
}

// Spawn musuh interval
setInterval(spawnEnemy, 1000);

// Start game
loop();
