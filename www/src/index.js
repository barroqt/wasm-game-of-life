import init, { Universe } from "../../pkg/wasm_game_of_life.js";
import { PATTERNS } from "./patterns.js";

const GRID_COLOR = "#1a1a1a";
const DEAD_COLOR = "#080808";
const ALIVE_COLOR = "#d4d4d4";
const HIGHLIGHT_COLOR = "rgba(212, 212, 212, 0.06)";

class GameOfLifeRenderer {
  constructor() {
    this.universe = null;
    this.wasm = null;
    this.canvas = document.getElementById("game-of-life-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.animationId = null;
    this.generationCount = 0;
    this.speed = 50;
    this.cellSize = 8;
    this.hoverCell = null;
    this.isDragging = false;
    this.dragStart = null;
    this.lastPaintedCell = null;
    this.dragPaintMode = true;
    this.fillDensity = 30;
    this.toggleAnimation = this.toggleAnimation.bind(this);
    this.reset = this.reset.bind(this);
    this.randomize = this.randomize.bind(this);
    this.setSpeed = this.setSpeed.bind(this);
    this.setFillDensity = this.setFillDensity.bind(this);
    this.selectPreset = this.selectPreset.bind(this);
    this.initControls();
    this.debounceTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.handleResize(), 150);
    });
  }

  computeLayout() {
    const headerEl = document.querySelector("header");
    const navEl = document.querySelector("nav");
    const headerH = headerEl ? headerEl.offsetHeight : 60;
    const navH = navEl ? navEl.offsetHeight : 56;
    const availW = window.innerWidth;
    const availH = window.innerHeight - headerH - navH;
    const gap = 1;

    let cellSize = 12;
    let cols = Math.floor(availW / (cellSize + gap));
    let rows = Math.floor(availH / (cellSize + gap));
    if (cols < 8) cols = 8;
    if (rows < 8) rows = 8;

    const cellFromW = Math.floor((availW - cols * gap - 1) / cols);
    const cellFromH = Math.floor((availH - rows * gap - 1) / rows);
    cellSize = Math.max(3, Math.min(cellFromW, cellFromH, 24));

    cols = Math.floor((availW - 1) / (cellSize + gap));
    rows = Math.floor((availH - 1) / (cellSize + gap));
    if (cols < 8) cols = 8;
    if (rows < 8) rows = 8;

    const canvasW = (cellSize + gap) * cols + 1;
    const canvasH = (cellSize + gap) * rows + 1;
    return { cols, rows, cellSize, width: Math.ceil(canvasW), height: Math.ceil(canvasH) };
  }

  async init() {
    this.wasm = await init();
    const layout = this.computeLayout();
    this.cellSize = layout.cellSize;
    this.universe = Universe.new_with_size(layout.cols, layout.rows);
    this.canvas.width = layout.width;
    this.canvas.height = layout.height;
    this.drawGrid();
    this.drawCells();
    this.updateStats();
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave());
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
  }

  handleResize() {
    if (!this.universe) return;
    const layout = this.computeLayout();
    this.cellSize = layout.cellSize;
    if (this.canvas.width !== layout.width || this.canvas.height !== layout.height) {
      const wasRunning = this.animationId !== null;
      if (wasRunning) this.pause();
      this.universe = Universe.new_with_size(layout.cols, layout.rows);
      this.canvas.width = layout.width;
      this.canvas.height = layout.height;
      this.generationCount = 0;
    this.drawGrid();
    this.drawCells();
    this.updateStats();
    document.getElementById("fill-label").textContent = `Fill ${this.fillDensity}%`;
    document.getElementById("speed-label").textContent = `Speed ${this.speed}%`;
      if (wasRunning) this.play();
    }
  }

  getCellCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const gap = 1;
    const col = Math.floor(x / (this.cellSize + gap));
    const row = Math.floor(y / (this.cellSize + gap));
    return { row, col };
  }

  handleMouseDown(e) {
    if (!this.universe) return;
    const { row, col } = this.getCellCoords(e);
    if (row < 0 || row >= this.universe.height() || col < 0 || col >= this.universe.width()) return;
    this.isDragging = true;
    this.dragStart = { row, col };
    this.lastPaintedCell = null;
    this.dragPaintMode = !this.universe.is_alive(row, col);
  }

  handleMouseUp(e) {
    if (!this.universe || !this.isDragging) return;
    const { row, col } = this.getCellCoords(e);
    if (this.dragStart && this.dragStart.row === row && this.dragStart.col === col) {
      this.universe.toggle_cell(row, col);
      this.drawCells();
      this.updateStats();
    }
    this.isDragging = false;
    this.dragPaintMode = false;
    this.dragStart = null;
    this.lastPaintedCell = null;
  }

  handleMouseMove(e) {
    if (!this.universe) return;
    const { row, col } = this.getCellCoords(e);
    const w = this.universe.width();
    const h = this.universe.height();
    if (row < 0 || row >= h || col < 0 || col >= w) {
      this.handleMouseLeave();
      return;
    }
    if (this.isDragging) {
      if (!this.lastPaintedCell || this.lastPaintedCell.row !== row || this.lastPaintedCell.col !== col) {
        this.universe.set_cell(row, col, this.dragPaintMode);
        this.lastPaintedCell = { row, col };
        this.hoverCell = { row, col };
        this.drawCells();
        this.updateStats();
      }
      return;
    }
    if (!this.hoverCell || this.hoverCell.row !== row || this.hoverCell.col !== col) {
      this.hoverCell = { row, col };
      this.drawCells();
      this.drawHighlight();
      this.canvas.style.cursor = "pointer";
    }
  }

  handleMouseLeave() {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragPaintMode = true;
      this.dragStart = null;
      this.lastPaintedCell = null;
    }
    if (this.hoverCell) {
      this.hoverCell = null;
      this.drawCells();
      this.canvas.style.cursor = "crosshair";
    }
  }

  drawHighlight() {
    if (!this.hoverCell || !this.universe) return;
    const { row, col } = this.hoverCell;
    const s = this.cellSize;
    const gap = 1;
    this.ctx.fillStyle = HIGHLIGHT_COLOR;
    this.ctx.fillRect(col * (s + gap) + 1, row * (s + gap) + 1, s, s);
  }

  drawGrid() {
    if (!this.universe) return;
    const w = this.universe.width();
    const h = this.universe.height();
    const s = this.cellSize;
    const gap = 1;
    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      this.ctx.moveTo(x * (s + gap) + 1, 0);
      this.ctx.lineTo(x * (s + gap) + 1, (s + gap) * h + 1);
    }
    for (let y = 0; y <= h; y++) {
      this.ctx.moveTo(0, y * (s + gap) + 1);
      this.ctx.lineTo((s + gap) * w + 1, y * (s + gap) + 1);
    }
    this.ctx.stroke();
  }

  drawCells() {
    if (!this.universe) return;
    const w = this.universe.width();
    const h = this.universe.height();
    const cells = new Uint8Array(this.wasm.memory.buffer, this.universe.cells(), w * h);
    const s = this.cellSize;
    const gap = 1;
    this.ctx.beginPath();
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const idx = row * w + col;
        this.ctx.fillStyle = cells[idx] === 0 ? DEAD_COLOR : ALIVE_COLOR;
        this.ctx.fillRect(col * (s + gap) + 1, row * (s + gap) + 1, s, s);
      }
    }
    this.ctx.stroke();
    this.drawHighlight();
  }

  initControls() {
    const playPauseButton = document.getElementById("play-pause");
    const resetButton = document.getElementById("reset");
    const randomizeButton = document.getElementById("randomize");
    const speedSlider = document.getElementById("speed");
    const fillSlider = document.getElementById("fill-density");
    if (playPauseButton) playPauseButton.addEventListener("click", this.toggleAnimation);
    if (resetButton) resetButton.addEventListener("click", this.reset);
    if (randomizeButton) randomizeButton.addEventListener("click", this.randomize);
    if (speedSlider) speedSlider.addEventListener("input", this.setSpeed);
    if (fillSlider) fillSlider.addEventListener("input", this.setFillDensity);
    const presetSelect = document.getElementById("presets");
    if (presetSelect) presetSelect.addEventListener("change", this.selectPreset);
    document.querySelectorAll(".speed-preset").forEach((btn) => {
      btn.addEventListener("click", () => this.setSpeedPreset(parseInt(btn.dataset.speed, 10)));
    });
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
    if (!this.universe) return;
    this.universe.randomize_with_density(this.fillDensity / 100);
    this.drawCells();
    this.updateStats();
  }

  setSpeedPreset(value) {
    this.speed = value;
    document.getElementById("speed").value = value;
    document.getElementById("speed-label").textContent = `Speed ${this.speed}`;
  }

  setFillDensity(e) {
    this.fillDensity = parseInt(e.target.value, 10);
    document.getElementById("fill-label").textContent = `Fill ${this.fillDensity}%`;
  }

  setSpeed(e) {
    this.speed = parseInt(e.target.value, 10);
    document.getElementById("speed-label").textContent = `Speed ${this.speed}`;
  }

  selectPreset(e) {
    const name = e.target.value;
    if (!name || !this.universe) return;
    e.target.value = "";
    this.pause();
    document.getElementById("play-pause").textContent = "Play";
    this.generationCount = 0;
    this.placePattern(name);
    this.drawCells();
    this.updateStats();
  }

  placePattern(name) {
    const cells = PATTERNS[name];
    if (!cells) return;
    const w = this.universe.width();
    const h = this.universe.height();
    let maxR = 0, maxC = 0;
    for (const [r, c] of cells) {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    const patternH = maxR + 1;
    const patternW = maxC + 1;
    if (patternW > w || patternH > h) return;
    const offsetR = Math.floor((h - patternH) / 2);
    const offsetC = Math.floor((w - patternW) / 2);
    this.universe = Universe.new_with_size(w, h);
    for (const [r, c] of cells) {
      this.universe.set_cell(offsetR + r, offsetC + c, true);
    }
  }

  updateStats() {
    if (!this.universe) return;
    const cells = new Uint8Array(
      this.wasm.memory.buffer,
      this.universe.cells(),
      this.universe.width() * this.universe.height()
    );
    document.getElementById("alive-cells").textContent = `${cells.reduce((s, c) => s + c, 0)}`;
    const genEl = document.getElementById("generation-count");
    genEl.textContent = `${this.generationCount}`;
    genEl.classList.remove("pulse");
    void genEl.offsetWidth;
    genEl.classList.add("pulse");
  }

  reset() {
    if (!this.universe) return;
    this.pause();
    document.getElementById("play-pause").textContent = "Play";
    const w = this.universe.width();
    const h = this.universe.height();
    this.universe = Universe.new_with_size(w, h);
    this.generationCount = 0;
    this.drawGrid();
    this.drawCells();
    this.updateStats();
  }
}

async function initApp() {
  const app = new GameOfLifeRenderer();
  await app.init();
}

initApp();
