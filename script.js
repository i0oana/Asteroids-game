const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const highScoreInputZone = document.getElementById('highScoreInputZone');
const playerNameInput = document.getElementById('playerNameInput');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const highScoreListElement = document.getElementById('highScoreList');
const restartBtn = document.getElementById('restartBtn');


function resizeCanvas() {
    if (window.innerWidth < 800) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    z: false, c: false, x: false, Enter: false 
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key === 'x') canShoot = true; 
});

function setupTouchControl(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; if(keyName==='x') canShoot = true; });
    btn.addEventListener('mousedown', () => { keys[keyName] = true; });
    btn.addEventListener('mouseup', () => { keys[keyName] = false; if(keyName==='x') canShoot = true; });
}

setupTouchControl('btnUp', 'ArrowUp');
setupTouchControl('btnDown', 'ArrowDown');
setupTouchControl('btnLeft', 'ArrowLeft');
setupTouchControl('btnRight', 'ArrowRight');
setupTouchControl('btnRotLeft', 'z');
setupTouchControl('btnRotRight', 'c');
setupTouchControl('btnShoot', 'x');


const HIGH_SCORES_KEY = 'jocInimioaraHighScores';

function getHighScores() {
    const scores = localStorage.getItem(HIGH_SCORES_KEY);
    return scores ? JSON.parse(scores) : [];
}

function saveHighScores(scores) {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
}

function updateLeaderboardUI() {
    const scores = getHighScores();
    highScoreListElement.innerHTML = scores.map(s => `<li><span>${s.name}</span> <span>${s.score}</span></li>`).join('');
}


saveScoreBtn.addEventListener('click', () => {
    const name = playerNameInput.value || 'Anonim';
    const score = player.score;
    
    const highScores = getHighScores();
    const newScore = { score, name };
    
 
    highScores.push(newScore);
    highScores.sort((a, b) => b.score - a.score);
    highScores.splice(5); 
    
    saveHighScores(highScores);
    updateLeaderboardUI();
    

    highScoreInputZone.classList.add('hidden');
});


restartBtn.addEventListener('click', restartGame);


let canShoot = true;
let isGameOver = false; 

const asteroids = [];
const rockets = [];
const particles = []; 
const numAsteroids = 5; 
const MAX_LIVES = 5; 

const POINTS_PER_ASTEROID = 100; 
const SCORE_FOR_EXTRA_LIFE = 1000; 


class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.dx = (Math.random() - 0.5) * 10; 
        this.dy = (Math.random() - 0.5) * 10;
        this.radius = Math.random() * 3 + 1; 
        this.life = 1.0; 
        const colors = ['#ff0000', '#ffa500', '#ffff00', '#ffffff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() { this.x += this.dx; this.y += this.dy; this.life -= 0.02; }
    draw() { ctx.save(); ctx.globalAlpha = this.life; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); ctx.restore(); }
}
function createExplosion(x, y) { for (let i = 0; i < 30; i++) particles.push(new Particle(x, y)); }

class Rocket {
    constructor(x, y, angle) {
        this.x = x; this.y = y; this.speed = 10; this.radius = 3;
        this.dx = Math.cos(angle) * this.speed; this.dy = Math.sin(angle) * this.speed;
    }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = 'yellow'; ctx.fill(); ctx.closePath(); }
    update() { this.x += this.dx; this.y += this.dy; this.draw(); }
}

class Spaceship {
    constructor() { this.resetPosition(); this.lives = 3; this.score = 0; this.nextLifeThreshold = SCORE_FOR_EXTRA_LIFE; this.rotationSpeed = 0.1; this.size = 20; }
    resetPosition() { this.x = canvas.width / 2; this.y = canvas.height / 2; this.speed = 5; this.angle = -Math.PI / 2; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.beginPath(); ctx.moveTo(this.size, 0); ctx.lineTo(-this.size, -this.size / 1.5); ctx.lineTo(-this.size, this.size / 1.5);
        ctx.closePath(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    update() {
        if (!isGameOver) {
            if (keys.ArrowUp) this.y -= this.speed; if (keys.ArrowDown) this.y += this.speed;
            if (keys.ArrowLeft) this.x -= this.speed; if (keys.ArrowRight) this.x += this.speed;
            if (this.x < 0) this.x = 0; if (this.x > canvas.width) this.x = canvas.width;
            if (this.y < 0) this.y = 0; if (this.y > canvas.height) this.y = canvas.height;
            if (keys.z) this.angle -= this.rotationSpeed; if (keys.c) this.angle += this.rotationSpeed;
            if (keys.x && canShoot && rockets.length < 3) {
                const tipX = this.x + Math.cos(this.angle) * this.size;
                const tipY = this.y + Math.sin(this.angle) * this.size;
                rockets.push(new Rocket(tipX, tipY, this.angle));
                canShoot = false;
            }
        }
        this.draw();
    }
}

class Asteroid {
    constructor() { this.reset(); }
    reset() {
        this.hp = Math.floor(Math.random() * 4) + 1; this.updateAppearance();
        let safe = false;
        while (!safe) {
            this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
            this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
            let distToCenter = getDistance(this.x, this.y, canvas.width/2, canvas.height/2);
            if (distToCenter > 150) safe = true;
        }
        this.dx = (Math.random() - 0.5) * 3; this.dy = (Math.random() - 0.5) * 3;
        if(Math.abs(this.dx) < 0.5) this.dx = 1; if(Math.abs(this.dy) < 0.5) this.dy = 1;
    }
    updateAppearance() {
        this.radius = this.hp * 12 + 8;
        switch(this.hp) { case 1: this.color = '#BDC3C7'; break; case 2: this.color = '#F1C40F'; break; case 3: this.color = '#E67E22'; break; case 4: this.color = '#922B21'; break; default: this.color = 'white'; }
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = 'bold ' + (this.radius) + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.hp, this.x, this.y); ctx.closePath();
    }
    update() {
        this.x += this.dx; this.y += this.dy;
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.dx = -this.dx;
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.dy = -this.dy;
        this.draw();
    }
}

function getDistance(x1, y1, x2, y2) { return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)); }
function resolveCollision(p1, p2) {
    const xVelocityDiff = p1.dx - p2.dx; const yVelocityDiff = p1.dy - p2.dy;
    const xDist = p2.x - p1.x; const yDist = p2.y - p1.y;
    if (xVelocityDiff * xDist + yVelocityDiff * yDist >= 0) {
        const angle = -Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const m1 = p1.radius; const m2 = p2.radius;
        const u1 = rotate(p1.dx, p1.dy, angle); const u2 = rotate(p2.dx, p2.dy, angle);
        const v1 = { x: u1.x * (m1 - m2) / (m1 + m2) + u2.x * 2 * m2 / (m1 + m2), y: u1.y };
        const v2 = { x: u2.x * (m1 - m2) / (m1 + m2) + u1.x * 2 * m1 / (m1 + m2), y: u2.y };
        const vFinal1 = rotate(v1.x, v1.y, -angle); const vFinal2 = rotate(v2.x, v2.y, -angle);
        p1.dx = vFinal1.x; p1.dy = vFinal1.y; p2.dx = vFinal2.x; p2.dy = vFinal2.y;
    }
}
function rotate(dx, dy, angle) { return { x: dx * Math.cos(angle) - dy * Math.sin(angle), y: dx * Math.sin(angle) + dy * Math.cos(angle) }; }

const player = new Spaceship();
function initAsteroids() { asteroids.length = 0; for (let i = 0; i < numAsteroids; i++) asteroids.push(new Asteroid()); }
function resetRound() { player.resetPosition(); rockets.length = 0; initAsteroids(); }


function endGame() {
    isGameOver = true;
    gameOverScreen.classList.remove('hidden'); 
    finalScoreDisplay.innerText = player.score;
    
    updateLeaderboardUI(); 

    const highScores = getHighScores();
    const lowestScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;

    if (player.score > lowestScore || highScores.length < 5) {
        highScoreInputZone.classList.remove('hidden'); 
        playerNameInput.value = ''; 
        playerNameInput.focus();
    } else {
        highScoreInputZone.classList.add('hidden');
    }
}

function restartGame() {
    player.lives = 3; player.score = 0; player.nextLifeThreshold = SCORE_FOR_EXTRA_LIFE; 
    isGameOver = false; 
    gameOverScreen.classList.add('hidden'); 
    resetRound(); 
    animate();
}
function init() { initAsteroids(); animate(); }


function drawHeart(x, y, size) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 25 * size, y - 25 * size, x - 50 * size, y, x, y + 45 * size);
    ctx.bezierCurveTo(x + 50 * size, y, x + 25 * size, y - 25 * size, x, y);
    ctx.fillStyle = 'red'; ctx.fill(); ctx.closePath();
}
function drawGUI() {
    const startX = 30; const startY = 30; const gap = 35; const scale = 0.4;
    for (let i = 0; i < player.lives; i++) { let x = startX + (i * gap); drawHeart(x, startY, scale); }
    ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'right';
    ctx.fillText('SCOR: ' + player.score, canvas.width - 20, 35);
}


function animate() {
    if (isGameOver) return; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGUI(); player.update();
    for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(); if (particles[i].life <= 0) particles.splice(i, 1); }
    

    for (let i = 0; i < asteroids.length; i++) {
        let ast = asteroids[i];
        if (getDistance(player.x, player.y, ast.x, ast.y) < ast.radius + player.size) {
            createExplosion(player.x, player.y);
            player.lives--; 
            if (player.lives > 0) { resetRound(); } else { endGame(); } 
            break;
        }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
        rockets[i].update(); let rocketHit = false;
        for (let j = 0; j < asteroids.length; j++) {
            let ast = asteroids[j];
            if (getDistance(rockets[i].x, rockets[i].y, ast.x, ast.y) < rockets[i].radius + ast.radius) {
                ast.hp--; ast.updateAppearance(); rocketHit = true;
                if (ast.hp <= 0) {
                    ast.reset(); player.score += POINTS_PER_ASTEROID;
                    if (player.score >= player.nextLifeThreshold) { if (player.lives < MAX_LIVES) player.lives++; player.nextLifeThreshold += SCORE_FOR_EXTRA_LIFE; }
                }
                break;
            }
        }
        if (rocketHit || rockets[i].x < 0 || rockets[i].x > canvas.width || rockets[i].y < 0 || rockets[i].y > canvas.height) rockets.splice(i, 1);
    }
    for (let i = 0; i < asteroids.length; i++) {
        for (let j = i + 1; j < asteroids.length; j++) {
            if (getDistance(asteroids[i].x, asteroids[i].y, asteroids[j].x, asteroids[j].y) < asteroids[i].radius + asteroids[j].radius) resolveCollision(asteroids[i], asteroids[j]);
        }
        asteroids[i].update();
    }
    requestAnimationFrame(animate);
}

init();
