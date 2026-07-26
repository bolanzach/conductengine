# Networking Architecture: Shared Simulation with Server Authority

## Overview

The Conduct Engine uses a **server-authoritative model with client-side simulation**. Both the server and every client run the same game simulation. The server validates player commands and broadcasts them to all clients. Clients apply commands locally and run the simulation independently — no waiting for the server to advance ticks. The server periodically sends state corrections; clients interpolate toward them to stay in sync.

This model gives instant local responsiveness (no input latency), scales to many entities (commands are small, corrections are infrequent), and keeps the server as the authority on game state.

```
Client A                    Server                    Client B
   |                          |                          |
   |--- command (move) ------>|                          |
   |  (apply locally too)     |--- broadcast command --->|
   |                          |  (apply + simulate)      |  (apply + simulate)
   |                          |                          |
   |  ... simulation runs ... |  ... simulation runs ... |  ... runs ...
   |                          |                          |
   |<--- correction ----------|--- correction ---------->|
   |  (interpolate toward)    |                          |  (interpolate toward)
```

## Project Structure

Most game logic is simulation — pure math that runs identically everywhere. Only networking I/O and rendering are environment-specific.

```
_game_rts/src/
  game/                    # was "shared" — runs on BOTH client and server
    systems/
      commandSystem.ts     # applies validated commands (pathfinding, etc.)
      pathfindingSystem.ts
      movementSystem.ts
      childTransformSystem.ts
      squadCenterSystem.ts
      colliderSystem.ts
      targetAcquisitionSystem.ts
    components/
      squad.ts
      squadMember.ts
      path.ts
      formationOffset.ts
      squadTarget.ts
      boundingBox.ts
      ...
    bundles.ts
    pathfinding.ts
    grid.ts
    network.ts             # component replication registration
    index.ts

  server/                  # thin — validation + broadcast
    index.ts               # server entrypoint, spawns initial world
    commandValidation.ts   # ownership checks before broadcasting

  client/                  # thin — rendering + input + camera
    index.ts
    rtsInputSystem.ts      # captures clicks, queues commands
    cameraPanSystem.ts
    fpsSystem.ts
    ownedAutoSelectSystem.ts
```

### What Moves to `game/`

Currently in `server/`, these are pure simulation with no server-specific logic:

| System | What It Does |
|--------|-------------|
| PathfindingSystem | Moves squads along waypoints |
| MovementSystem | Moves squad members toward formation positions |
| ChildTransformSystem | Updates child entity transforms from parent |
| SquadCenterSystem | Computes squad center from member positions |
| ColliderSystem | Spatial collision detection |
| TargetAcquisitionSystem | Assigns combat targets by proximity |
| CommandSystem | Applies commands (pathfinding, cancel engagement) |

CommandSystem splits into two pieces: the **command application logic** (moves to `game/`) and the **command consumption from network** (stays environment-specific — server reads from network, client reads from broadcast queue).

### What Stays in `server/`

- Command validation (ownership checks via `Networked.owner`)
- Command broadcast to all clients
- Periodic state correction snapshots
- Initial world spawn + full state snapshot for late joiners

### What Stays in `client/`

- Input capture (RtsInputSystem)
- Camera (CameraSystem, CameraPanSystem)
- Rendering (RendererSystem, MeshRenderer, Material)
- FPS display
- OwnedAutoSelectSystem (client UI concern)
- Correction interpolation system (client-only visual smoothing)

## Command Flow

### Current Model (Dumb Client)

```
Client → command → Server (runs simulation) → snapshot (every tick) → Client (applies positions)
```

Client sends commands, server does all work, client just renders received state.

### New Model (Shared Simulation)

```
Client → command → Server (validates) → broadcast → All clients (apply + simulate)
                                       → Server (apply + simulate)
```

1. **Client captures input** — RtsInputSystem creates a `GameCommand` (e.g., `{ type: 'move', entities: [5, 6], x: 10, z: 3 }`)
2. **Client applies locally** — the command is immediately pushed into the local command queue. CommandSystem (running locally) processes it on the next FixedUpdate tick. The player sees their units react instantly.
3. **Client sends to server** — the command is also sent over WebSocket.
4. **Server validates** — checks ownership (`Networked.owner === command.playerId`), rejects invalid commands.
5. **Server broadcasts** — sends validated command to ALL clients (including the sender, as confirmation).
6. **Server applies locally** — server's own CommandSystem processes the command.
7. **Other clients receive** — they push the command into their local queue, CommandSystem processes it.

### Protocol Changes

Add a new message type for broadcasting validated commands:

```typescript
// Server → All Clients: validated commands for a tick
| { type: 'commands'; payload: { tick: number; commands: GameCommand[] } }
```

The existing `'snapshot'` message type remains but is sent at reduced frequency for corrections.

## Entity ID Consistency

### Current Problem

The server and client generate entity IDs independently. The client maintains a bidirectional mapping (`entityMap.ts`) to translate between server IDs and local IDs. This works for the dumb-client model but breaks when clients run simulation — a command referencing "entity 42" must mean the same entity on every machine.

### Solution

**Server-assigned entity IDs.** When a client first connects, the server sends a full state snapshot. The client spawns entities using the server's IDs directly. When new entities are created during gameplay (via commands), the deterministic simulation ensures the same entities are created in the same order on all machines — but the server's periodic corrections reconcile any drift.

This removes the need for `entityMap.ts` and its bidirectional ID translation.

### Late Joiners

A client connecting mid-game receives a full state snapshot (same as current `'snapshot'` format) to bootstrap the entire world. After that, it switches to command-based simulation with periodic corrections.

## State Corrections

The server is the authority. Even though all clients run the same simulation, small differences accumulate — floating point, timing, missed commands. The server periodically sends corrections.

### Correction Frequency

- **Not every tick** — that's the current model and defeats the purpose
- **Periodic** — e.g., every 5-10 ticks (100-200ms at 60 Hz simulation)
- **Adaptive** — could increase frequency when divergence is detected
- Start with a fixed interval and tune from there

### Correction Format

Same as the current `Snapshot` format — entity ID + replicated component data. The difference is how the client handles it:

| Current (dumb client) | New (shared simulation) |
|---|---|
| Overwrites local state immediately | Stores as correction target |
| Every tick at full rate | Periodic at reduced rate |
| Client has no local simulation | Client compares against local state |

### Correction Application

When a correction arrives:

1. For each entity in the correction, compare server position against local position
2. If the difference is below a **snap threshold** (e.g., < 0.01 units): ignore, local state is close enough
3. If the difference is above a **teleport threshold** (e.g., > 5 units): snap immediately, something major diverged
4. Otherwise: set a correction target and interpolate toward it over several frames

## Interpolation Strategy

Corrections are applied visually through interpolation — never snapping (unless the error is huge).

### Per-Entity Correction

When the server correction for entity E says position should be `(10.3, 0, 5.1)` but the client has `(10.1, 0, 5.0)`:

- Store the server position as a **correction target**
- Each frame, lerp the entity's rendered position toward the target:
  ```
  position = lerp(position, target, correctionRate * deltaTime)
  ```
- When within threshold of the target, consider the correction complete

### Correction Rates

Different entity types may want different correction speeds:

- **Units** — slow lerp (0.1-0.3). Small positional errors are barely visible, aggressive correction causes jitter.
- **Projectiles** — fast lerp or snap. Speed matters more than smoothness.
- **Static entities** (tiles, buildings) — snap. They shouldn't diverge at all.

### What Gets Corrected

Only **simulation state** (Transform3D positions, component values). Client-only state (camera position, selection, UI) is never corrected.

## Client Game Loop

The client's FixedUpdate loop runs the same systems as the server:

```
FixedUpdate (simulation tick rate):
  1. CommandReceiveSystem       ← receive broadcast commands from server
  2. CommandSystem              ← apply commands (same code as server)
  3. PathfindingSystem          ← same as server
  4. TargetAcquisitionSystem    ← same as server
  5. MovementSystem             ← same as server
  6. ChildTransformSystem       ← same as server
  7. SquadCenterSystem          ← same as server
  8. ColliderSystem             ← same as server
  9. CorrectionSystem           ← apply any pending server corrections
  10. ClientCommandSendSystem   ← send local commands to server

Update (render frame rate):
  1. InputSystem
  2. RtsInputSystem
  3. CameraSystem
  4. CameraPanSystem
  5. InterpolationSystem        ← smooth correction lerps at render rate
  6. RendererSystem
  7. FpsSystem
```

The server's loop is similar but replaces the client networking systems:

```
FixedUpdate:
  1. CommandValidationSystem    ← validate + broadcast incoming commands
  2. CommandSystem              ← apply commands (same code)
  3. PathfindingSystem
  4. TargetAcquisitionSystem
  5. MovementSystem
  6. ChildTransformSystem
  7. SquadCenterSystem
  8. ColliderSystem
  9. CorrectionSnapshotSystem   ← periodic state snapshot to all clients
```

## Networking Package Changes

### Modified

| File | Change |
|------|--------|
| `protocol.ts` | Add `'commands'` message type |
| `serverNetworkSnapshotSystem.ts` | Reduce to periodic corrections (not every tick) |
| `clientNetworkReceiveSystem.ts` | Store corrections as targets instead of overwriting state |

### New

| File | Purpose |
|------|---------|
| `serverCommandBroadcastSystem.ts` | Validates commands, broadcasts to all clients |
| `clientCommandReceiveSystem.ts` | Receives broadcast commands, pushes to local command queue |

### Potentially Removable

| File | Why |
|------|-----|
| `entityMap.ts` | No longer needed if client uses server entity IDs directly |

## What This Doesn't Cover

These are future enhancements, not part of the initial architecture:

- **Delta compression** — only send entities that changed in corrections, not the full world
- **Interest management** — only send entities near the player, not everything
- **Determinism guarantees** — cross-browser determinism (V8 vs SpiderMonkey math differences). Same-engine (Node + Chrome, both V8) is likely deterministic in practice
- **Full rollback/resimulation** — rewinding world state when a correction contradicts past simulation. The interpolation model avoids this by accepting small drift
- **Tick synchronization** — clients don't need to be on the same tick. They run freely and corrections keep them close enough
- **Entity creation conflicts** — what happens if client and server create different entities. Corrections handle this, but a formal entity authority model may be needed later