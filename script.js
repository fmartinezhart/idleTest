const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');

const gameSize = 400;
const dotSize = 10;
const playerSize = 20;
const dotCount = 20;

let score = 0;

// Create dots at random positions
let dots = [];
for (let i = 0; i < dotCount; i++) {
  const dot = document.createElement('div');
  dot.classList.add('dot');
  dot.style.left = Math.floor(Math.random() * (gameSize - dotSize)) + 'px';
  dot.style.top = Math.floor(Math.random() * (gameSize - dotSize)) + 'px';
  gameContainer.appendChild(dot);
  dots.push(dot);
}

// Create player
const player = document.createElement('div');
player.id = 'player';
player.style.left = '190px';
player.style.top = '190px';
gameContainer.appendChild(player);

// Player position
let playerX = 190;
let playerY = 190;

// Move player with arrow keys
document.addEventListener('keydown', function(e) {
  switch (e.key) {
    case 'ArrowUp':
      playerY = Math.max(0, playerY - 10);
      break;
    case 'ArrowDown':
      playerY = Math.min(gameSize - playerSize, playerY + 10);
      break;
    case 'ArrowLeft':
      playerX = Math.max(0, playerX - 10);
      break;
    case 'ArrowRight':
      playerX = Math.min(gameSize - playerSize, playerX + 10);
      break;
  }
  player.style.left = playerX + 'px';
  player.style.top = playerY + 'px';
  checkCollision();
});

// Check for collision with dots
function checkCollision() {
  dots.forEach((dot, idx) => {
    if (dot) {
      const dx = parseInt(dot.style.left);
      const dy = parseInt(dot.style.top);
      if (
        playerX < dx + dotSize &&
        playerX + playerSize > dx &&
        playerY < dy + dotSize &&
        playerY + playerSize > dy
      ) {
        // Collect dot!
        gameContainer.removeChild(dot);
        dots[idx] = null;
        score++;
        scoreDisplay.textContent = 'Score: ' + score;
      }
    }
  });
}