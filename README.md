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

## Packages

| Package | Description |
|---|---|
| `@conduct/ecs` | Core ECS runtime, compiler, and Vite plugin |
| `@conduct/simulation` | Reusable game components (Transform2D/3D, Input) and systems |
| `@conduct/examples` | Example web app demonstrating the ECS in action |
