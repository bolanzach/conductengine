# Conduct Engine

A high-performance 3D game engine built with TypeScript.

## Prerequisites

- Node.js >= 24.11.0
- pnpm >= 9.0.0

## Setup

```bash
pnpm install
```

After installing dependencies, ensure `ts-patch` has patched the local TypeScript installation (this enables the ECS compiler plugin to run as a `tsc` transformer):

```bash
cd packages/ecs
npx ts-patch install
```

You can verify the patch with `npx ts-patch check`.

## Building

```bash
pnpm build
```

## Running the Example

```bash
cd packages/examples
pnpm dev
```

Use playwright to open and test in the browser:

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
npx playwright-cli reload
npx playwright-cli close
```

## Packages

Treat `_game_rts` as a separate driver application that consumes the Conduct Engine packages.

| Package               | Description                                                  |
|-----------------------|--------------------------------------------------------------|
| `@conduct/ecs`        | Core ECS runtime, compiler, and Vite plugin                  |
| `@conduct/events`     | Foundational events mechanisms                               |
| `@conduct/simulation` | Reusable game components (Transform2D/3D, Input) and systems |
| `@conduct/networking` | The engine's net code for multiplayer                        |
| `@conduct/renderer`   | Handles the engine rendering (WebGPU)                        |
| `@conduct/_game_rts`  | The actual Real-Time-Strategy game that _uses_ the engine    |
