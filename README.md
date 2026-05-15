# Game of Life

Conway's Game of Life is a **cellular automaton** — a zero-player game where an initial grid of cells evolves according to four simple rules:

1. **Underpopulation** — a live cell with < 2 live neighbors dies
2. **Survival** — a live cell with 2 or 3 live neighbors lives on
3. **Overpopulation** — a live cell with > 3 live neighbors dies
4. **Reproduction** — a dead cell with exactly 3 live neighbors becomes alive

Despite these trivial rules, complex patterns emerge: gliders that travel across the grid, oscillators that pulse in place, and even Turing-complete constructions.

## Quick Start

```bash
cargo install wasm-pack
cd www && pnpm install && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) — click **Play** to start, **Randomize** for a random seed, **Reset** for the default pattern, and drag the speed slider to control tick rate.

## Tech Stack

| Layer | |
|-------|---|
| Language | Rust → Wasm (wasm-bindgen) |
| Frontend | Vite + vanilla JS |
| Rendering | Canvas 2D |
