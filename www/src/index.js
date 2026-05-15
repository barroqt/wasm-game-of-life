import init, { Universe } from "../../pkg/wasm_game_of_life.js";

const CELL_SIZE = 8;
const GRID_COLOR = "#2a2a4e";
const DEAD_COLOR = "#0f3460";
const ALIVE_COLOR = "#536dfe";

class GameOfLifeRenderer {
  constructor() {
    this.universe = null;
    this.canvas = document.getElementById("game-of-life-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.animationId = null;
    this.generationCount = 0;
    this.speed = 50;
    this.initControls();
    this.toggleAnimation = this.toggleAnimation.bind(this);
    this.reset = this.reset.bind(this);
    this.randomize = this.randomize.bind(this);
    this.setSpeed = this.setSpeed.bind(this);
  }

  async init() {
    this.wasm = await init();
    this.universe = Universe.new();
    this.setupCanvas();
    this.drawGrid();
    this.drawCells();
  }

  setupCanvas() {
    const width = this.universe.width();
    const height = this.universe.height();
    this.canvas.height = (CELL_SIZE + 1) * height + 1;
    this.canvas.width = (CELL_SIZE + 1) * width + 1;
  }

  drawGrid() {
    const width = this.universe.width();
    const height = this.universe.height();

    this.ctx.beginPath();
    this.ctx.strokeStyle = GRID_COLOR;

    // Vertical lines
    for (let x = 0; x <= width; x++) {
      this.ctx.moveTo(x * (CELL_SIZE + 1) + 1, 0);
      this.ctx.lineTo(x * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      this.ctx.moveTo(0, y * (CELL_SIZE + 1) + 1);
      this.ctx.lineTo((CELL_SIZE + 1) * width + 1, y * (CELL_SIZE + 1) + 1);
    }

    this.ctx.stroke();
  }

  drawCells() {
    const width = this.universe.width();
    const height = this.universe.height();
    const cells = new Uint8Array(
      this.wasm.memory.buffer,
      this.universe.cells(),
      width * height
    );

    this.ctx.beginPath();

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = row * width + col;

        this.ctx.fillStyle = cells[idx] === 0 ? DEAD_COLOR : ALIVE_COLOR;

        this.ctx.fillRect(
          col * (CELL_SIZE + 1) + 1,
          row * (CELL_SIZE + 1) + 1,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }

    this.ctx.stroke();
  }

  initControls() {
    const playPauseButton = document.getElementById("play-pause");
    const resetButton = document.getElementById("reset");
    const randomizeButton = document.getElementById("randomize");
    const speedSlider = document.getElementById("speed");
    if (playPauseButton) {
      playPauseButton.addEventListener("click", this.toggleAnimation);
    }
    if (resetButton) {
      resetButton.addEventListener("click", this.reset);
    }
    if (randomizeButton) {
      randomizeButton.addEventListener("click", this.randomize);
    }
    if (speedSlider) {
      speedSlider.addEventListener("input", this.setSpeed);
    }
  }

  toggleAnimation() {
    if (this.animationId === null) {
      this.play();
      document.getElementById("play-pause").textContent = "Pause";
    } else {
      this.pause();
      document.getElementById("play-pause").textContent = "Play";
    }
  }

  play() {
    const frame = () => {
      this.universe.tick();
      this.drawCells();
      this.generationCount++;
      this.updateStats();
      const delay = this.speed >= 100 ? 16 : Math.round(5000 / this.speed);
      this.animationId = setTimeout(frame, delay);
    };
    frame();
  }

  pause() {
    clearTimeout(this.animationId);
    this.animationId = null;
  }

  randomize() {
    if (this.universe) {
      this.universe.randomize();
      this.drawCells();
      this.updateStats();
    }
  }

  setSpeed(e) {
    this.speed = parseInt(e.target.value, 10);
  }

  updateStats() {
    const cells = new Uint8Array(
      this.wasm.memory.buffer,
      this.universe.cells(),
      this.universe.width() * this.universe.height()
    );
    const alive = cells.reduce((sum, c) => sum + c, 0);
    document.getElementById("alive-cells").textContent = `Alive Cells: ${alive}`;
    document.getElementById(
      "generation-count"
    ).textContent = `Generation: ${this.generationCount}`;
  }

  reset() {
    if (this.universe) {
      this.pause();
      document.getElementById("play-pause").textContent = "Play";
      this.universe = Universe.new();
      this.generationCount = 0;
      this.drawCells();
      this.updateStats();
    }
  }
}

async function initApp() {
  const gameRenderer = new GameOfLifeRenderer();

  await gameRenderer.init();
}

initApp();
