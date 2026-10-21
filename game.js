// Tetris Game for GitHub Pages
// Controls: Arrow keys to move, Up to rotate, Space to drop, P to pause

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF5722', // I - orange
    '#2196F3', // J - blue
    '#4CAF50', // L - green
    '#FFEB3B', // O - yellow
    '#9C27B0', // S - purple
    '#00BCD4', // T - cyan
    '#F44336'  // Z - red
];

// Tetromino shapes
const SHAPES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
    [[0, 4, 4], [0, 4, 4], [0, 0, 0]],                         // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
];

// Game state
let canvas, ctx;
let nextCanvas, nextCtx;
let board = [];
let currentPiece, nextPiece;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropStart;
let lastTime = 0;
let dropInterval = 1000;

// Initialize the game
function init() {
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('next');
    nextCtx = nextCanvas.getContext('2d');
    
    // Scale canvas
    ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextCtx.scale(BLOCK_SIZE / 2, BLOCK_SIZE / 2);
    
    // Set line width after scaling so it's 1px in screen coordinates
    ctx.lineWidth = 1 / BLOCK_SIZE;
    nextCtx.lineWidth = 1 / (BLOCK_SIZE / 2);
    
    // Create empty board
    createBoard();
    
    // Create first pieces
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    
    // Start game loop
    dropStart = Date.now();
    requestAnimationFrame(update);
    
    // Add event listeners
    document.addEventListener('keydown', control);
}

// Create empty board
function createBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Generate random piece
function randomPiece() {
    const r = Math.floor(Math.random() * 7) + 1;
    return {
        shape: SHAPES[r],
        color: COLORS[r],
        pos: { x: Math.floor(COLS / 2) - 1, y: 0 }
    };
}

// Draw the game
function draw() {
    // Clear main canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, COLS, ROWS);
    
    // Draw board
    drawBoard();
    
    // Draw current piece
    drawPiece(currentPiece);
    
    // Draw next piece preview
    drawNext();
}

// Draw the board
function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                ctx.fillStyle = COLORS[board[y][x]];
                ctx.fillRect(x, y, 1, 1);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(x, y, 1, 1);
            }
        }
    }
}

// Draw current piece
function drawPiece(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                ctx.fillStyle = piece.color;
                ctx.fillRect(piece.pos.x + x, piece.pos.y + y, 1, 1);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(piece.pos.x + x, piece.pos.y + y, 1, 1);
            }
        }
    }
}

// Draw next piece preview
function drawNext() {
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, 6, 6);
    
    if (nextPiece) {
        const offsetX = 2 - Math.floor(nextPiece.shape[0].length / 2);
        const offsetY = 2 - Math.floor(nextPiece.shape.length / 2);
        
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    nextCtx.fillStyle = nextPiece.color;
                    nextCtx.fillRect(offsetX + x, offsetY + y, 1, 1);
                    nextCtx.strokeStyle = '#000';
                    nextCtx.strokeRect(offsetX + x, offsetY + y, 1, 1);
                }
            }
        }
    }
}

// Check for collisions
function collision(piece, offset = { x: 0, y: 0 }) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.pos.x + x + offset.x;
                const newY = piece.pos.y + y + offset.y;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Rotate piece
function rotate(piece) {
    const rotated = [];
    for (let y = 0; y < piece.shape[0].length; y++) {
        rotated[y] = [];
        for (let x = 0; x < piece.shape.length; x++) {
            rotated[y][x] = piece.shape[piece.shape.length - 1 - x][y];
        }
    }
    return rotated;
}

// Lock piece in place
function lock() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.pos.y + y;
                const boardX = currentPiece.pos.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.shape[y][x];
                }
            }
        }
    }
    
    // Check for completed lines
    checkLines();
    
    // Get next piece
    currentPiece = nextPiece;
    nextPiece = randomPiece();
    currentPiece.pos = { x: Math.floor(COLS / 2) - 1, y: 0 };
    
    // Check if game over
    if (collision(currentPiece)) {
        gameOver = true;
        alert('Game Over! Score: ' + score);
        createBoard();
        currentPiece = randomPiece();
        nextPiece = randomPiece();
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        updateScore();
    }
    
    dropStart = Date.now();
}

// Check for completed lines
function checkLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            // Remove the line
            board.splice(y, 1);
            // Add new empty line at top
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check the same row again (now shifted down)
        }
    }
    
    if (linesCleared > 0) {
        // Update score
        const points = [0, 100, 300, 500, 800]; // Points for 0, 1, 2, 3, 4 lines
        score += points[linesCleared] * level;
        lines += linesCleared;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        
        // Speed up the game
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateScore();
    }
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// Move piece
function movePiece(piece, direction) {
    if (!collision(piece, direction)) {
        piece.pos.x += direction.x;
        piece.pos.y += direction.y;
        return true;
    }
    return false;
}

// Hard drop
function hardDrop() {
    while (movePiece(currentPiece, { x: 0, y: 1 })) {
        // Keep moving down
    }
    lock();
}

// Handle keyboard controls
function control(e) {
    if (gameOver || isPaused) return;
    
    switch (e.keyCode) {
        case 37: // Left arrow
            movePiece(currentPiece, { x: -1, y: 0 });
            break;
        case 39: // Right arrow
            movePiece(currentPiece, { x: 1, y: 0 });
            break;
        case 40: // Down arrow
            movePiece(currentPiece, { x: 0, y: 1 });
            break;
        case 38: // Up arrow
            const rotated = rotate(currentPiece);
            if (!collision({ shape: rotated, pos: currentPiece.pos })) {
                currentPiece.shape = rotated;
            }
            break;
        case 32: // Space
            hardDrop();
            break;
        case 80: // P
            isPaused = !isPaused;
            if (!isPaused) {
                dropStart = Date.now();
            }
            break;
    }
    
    draw();
}

// Update game state
function update(time = 0) {
    if (gameOver || isPaused) {
        draw();
        requestAnimationFrame(update);
        return;
    }
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    const now = Date.now();
    const delta = now - dropStart;
    
    if (delta > dropInterval) {
        if (!movePiece(currentPiece, { x: 0, y: 1 })) {
            lock();
        }
        dropStart = now;
    }
    
    draw();
    requestAnimationFrame(update);
}

// Start the game when the page loads
window.addEventListener('load', init);
