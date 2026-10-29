
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let keys = {};
let ship;
let asteroids = [];
let bullets = [];
let particles = [];
let score = 0;
let lives = 3;
let running = false;
let gameOver = false;
let lastShot = 0;
let lastTime = 0;
let animationId;

function createShip() {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    radius: 12,
    invulnerable: 2
  };
}

function createAsteroid(x, y, radius) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 35 + Math.random() * 65;
  const vertices = [];

  for (let i = 0; i < 10; i++) {
    vertices.push(0.75 + Math.random() * 0.45);
  }

  return {
    x, y, radius,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    vertices
  };
}

function resetGame() {
  score = 0;
  lives = 3;
  bullets = [];
  particles = [];
  asteroids = [];
  ship = createShip();

  for (let i = 0; i < 5; i++) {
    let asteroid;

    do {
      asteroid = createAsteroid(
        Math.random() * WIDTH,
        Math.random() * HEIGHT,
        35
      );
    } while (
      Math.hypot(
        asteroid.x - ship.x,
        asteroid.y - ship.y
      ) < 120
    );

    asteroids.push(asteroid);
  }

  scoreDisplay.textContent = score;
  livesDisplay.textContent = lives;
}

function startGame() {
  cancelAnimationFrame(animationId);
  resetGame();
  running = true;
  gameOver = false;
  lastTime = 0;
  overlay.style.display = "none";
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  gameOver = true;
  overlayTitle.textContent = "GAME OVER";
  overlayMessage.textContent = `Final Score: ${score}`;
  startButton.textContent = "PLAY AGAIN";
  overlay.style.display = "block";
}

function wrap(object) {
  if (object.x < 0) object.x += WIDTH;
  if (object.x > WIDTH) object.x -= WIDTH;
  if (object.y < 0) object.y += HEIGHT;
  if (object.y > HEIGHT) object.y -= HEIGHT;
}

function shoot() {
  const now = performance.now();

  if (now - lastShot < 250) return;
  lastShot = now;

  bullets.push({
    x: ship.x + Math.cos(ship.angle) * 16,
    y: ship.y + Math.sin(ship.angle) * 16,
    vx: ship.vx + Math.cos(ship.angle) * 350,
    vy: ship.vy + Math.sin(ship.angle) * 350,
    life: 1.3
  });
}

function update(dt) {
  if (keys.ArrowLeft) ship.angle -= 4 * dt;
  if (keys.ArrowRight) ship.angle += 4 * dt;

  if (keys.ArrowUp) {
    ship.vx += Math.cos(ship.angle) * 180 * dt;
    ship.vy += Math.sin(ship.angle) * 180 * dt;
  }

  ship.vx *= Math.pow(0.99, dt * 60);
  ship.vy *= Math.pow(0.99, dt * 60);

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);

  if (ship.invulnerable > 0) {
    ship.invulnerable -= dt;
  }

  if (keys.Space) shoot();

  for (const bullet of bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    wrap(bullet);
  }

  bullets = bullets.filter(bullet => bullet.life > 0);

  for (const asteroid of asteroids) {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    wrap(asteroid);
  }

  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];

    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];

      if (
        Math.hypot(
          asteroid.x - bullet.x,
          asteroid.y - bullet.y
        ) < asteroid.radius
      ) {
        asteroids.splice(i, 1);
        bullets.splice(j, 1);
        score += asteroid.radius >= 30 ? 20 : 50;
        scoreDisplay.textContent = score;

        if (asteroid.radius > 15) {
          for (let k = 0; k < 2; k++) {
            asteroids.push(
              createAsteroid(
                asteroid.x,
                asteroid.y,
                asteroid.radius * 0.55
              )
            );
          }
        }

        break;
      }
    }
  }

  if (ship.invulnerable <= 0) {
    for (const asteroid of asteroids) {
      if (
        Math.hypot(
          ship.x - asteroid.x,
          ship.y - asteroid.y
        ) < ship.radius + asteroid.radius * 0.8
      ) {
        lives--;
        livesDisplay.textContent = lives;
        ship = createShip();

        if (lives <= 0) {
          endGame();
        }

        break;
      }
    }
  }

  if (asteroids.length === 0) {
    for (let i = 0; i < 5; i++) {
      asteroids.push(
        createAsteroid(
          Math.random() * WIDTH,
          Math.random() * HEIGHT,
          35
        )
      );
    }
  }
}

function drawShip() {
  if (
    ship.invulnerable > 0 &&
    Math.floor(performance.now() / 100) % 2 === 0
  ) {
    return;
  }

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.strokeStyle = "#63f5ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-12, -10);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.stroke();

  if (keys.ArrowUp) {
    ctx.strokeStyle = "#ffae42";
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-18 - Math.random() * 8, 0);
    ctx.lineTo(-8, 5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroids() {
  for (const asteroid of asteroids) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.strokeStyle = "#d5dbe8";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < asteroid.vertices.length; i++) {
      const angle =
        (i / asteroid.vertices.length) * Math.PI * 2;
      const radius =
        asteroid.radius * asteroid.vertices[i];
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets() {
  ctx.fillStyle = "#ffffff";

  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStars() {
  ctx.fillStyle = "#50627f";

  for (let i = 0; i < 65; i++) {
    const x = (i * 137.5) % WIDTH;
    const y = (i * 83.7) % HEIGHT;
    ctx.fillRect(x, y, 2, 2);
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawStars();
  drawAsteroids();
  drawBullets();

  if (ship) drawShip();
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.03)
    : 0;

  lastTime = timestamp;

  update(dt);
  draw();

  if (running) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

document.addEventListener("keydown", event => {
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)
  ) {
    event.preventDefault();
  }

  keys[event.code] = true;

  if (event.code === "KeyP" && running) {
    running = false;
    overlayTitle.textContent = "PAUSED";
    overlayMessage.textContent = "Press P to resume.";
    startButton.textContent = "RESUME";
    overlay.style.display = "block";
  } else if (event.code === "KeyP" && !running && !gameOver) {
    running = true;
    overlay.style.display = "none";
    lastTime = 0;
    animationId = requestAnimationFrame(gameLoop);
  }
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

startButton.addEventListener("click", () => {
  if (!running) startGame();
});

draw();
