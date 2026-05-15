# Conduct Engine

See the [MVP doc](docs/game-mvp.md) for the one-month vision.

## Project Structure

This is a game engine library built with TypeScript that is meant to be consumed by other applications.
Treat `packages/examples` as the separate driver application that consumes the Conduct Engine packages.
The examples is an MVP game specified in the [MVP doc](docs/game-mvp.md).

The examples run with Vite for hot module reloading and ease of development, but the core engine packages are framework-agnostic and can be consumed by any TypeScript project.
When updating the engine packages we must `build` them in order for the examples to properly consume the latest changes.

## Instructions

- You must follow existing patterns found in the codebase.
- Code is in `packages` with each package being a separate module with `pnpm`. When exploring the codebase, only look at the package(s) that are relevant to your task. Do not look at all packages at once, unless your task requires it.
- We can change the core engine packages as needed.
- When modifying core engine packages, you must always consider performance as it relates to a game engine.
