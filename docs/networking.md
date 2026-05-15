# Multiplayer Architecture Design

## Context

Conduct Engine needs networking for a 2-player co-op RTS. We have a unique advantage: TypeScript on both client and server means shared game logic. The goal is to design this at the foundation level so networking isn't bolted on later.

## Networking Model: Server-Authoritative with Command Replication

**Why not lockstep deterministic (AoE/StarCraft style)?**
- Requires bit-identical simulation across all peers (floating point determinism across browsers is fragile)
- Latency = slowest peer (bad UX)
- Desync is catastrophic and hard to debug
- Overkill for co-op (no anti-cheat needed between cooperating players)

**Why server-authoritative with commands?**
- Server runs the "real" simulation — single source of truth
- Clients send high-level commands ("move units to X", "build at Y"), not raw input
- Server validates and applies commands, broadcasts state
- Clients run local simulation for visual smoothing, reconcile with server snapshots
- Commands are sparse in RTS (vs FPS), so bandwidth is low
- Simple to reason about: server is always right

## Package Architecture

```
packages/
  ecs/           - Core ECS (shared, unchanged)
  simulation/    - Components + shared systems (shared)
  networking/    - NEW: transport, serialization, protocol (shared)
  renderer/      - WebGPU renderer (client-only)
  server/        - Server runtime + server-only systems (server-only)
  examples/      - Client runtime + client-only systems (client-only)
```

### What goes where

| Package | Runs on | Contains |
|---------|---------|----------|
| `ecs` | Both | World, entities, components, queries, compiler |
| `simulation` | Both | Game components (Transform3D, etc.), shared systems (MovementSystem, CombatSystem, EconomySystem) |
| `networking` | Both | WebSocket transport, serialization, protocol messages, command types |
| `renderer` | Client | WebGPU, Camera, MeshRenderer, RendererSystem |
| `server` | Server | Node.js entry point, AISystem, server tick loop, connection management |
| `examples` | Client | Browser entry point, InputSystem, CameraSystem, client prediction |

## Code Sharing Strategy

**No runtime flag.** Instead: separate entry points that import shared packages.

The runtime flag approach (`CONDUCT_CLIENT_SERVER`) has a fundamental problem — even with dead code elimination, bundlers can't tree-shake dynamic branches reliably, so the client bundle would include server-only code (AI logic, authority validation). More importantly, it conflates two different applications into one, making reasoning about each harder.

Instead, the "same app code" pattern works through **shared packages**:

```
Server entry point (packages/server/src/main.ts):
  imports from @conduct/ecs
  imports from @conduct/simulation    ← shared game logic
  imports from @conduct/networking
  registers: FixedUpdate systems (shared + server-only)
  calls: ConductStart(20)            ← engine uses setInterval (no rAF available)

Client entry point (packages/examples/src/main.ts):
  imports from @conduct/ecs
  imports from @conduct/simulation    ← same shared game logic
  imports from @conduct/networking
  imports from @conduct/renderer
  registers: FixedUpdate systems (shared + client-only) + Update systems (render)
  calls: ConductStart(20)            ← engine uses rAF + accumulator
```

The game logic (MovementSystem, CombatSystem, EconomySystem, etc.) lives in `@conduct/simulation` and runs identically on both. The difference is what systems surround it:

```
SERVER — all FixedUpdate:
  ConductRegisterSystem(FixedUpdate, ServerNetworkReceiveSystem)  → ingest client commands
  ConductRegisterSystem(FixedUpdate, CommandProcessingSystem)     → validate + queue commands
  ConductRegisterSystem(FixedUpdate, MovementSystem)              → shared
  ConductRegisterSystem(FixedUpdate, CombatSystem)                → shared
  ConductRegisterSystem(FixedUpdate, EconomySystem)               → shared
  ConductRegisterSystem(FixedUpdate, AISystem)                    → server-only
  ConductRegisterSystem(FixedUpdate, ServerNetworkSendSystem)     → broadcast state snapshots

CLIENT — FixedUpdate for simulation, Update for rendering:
  ConductRegisterSystem(FixedUpdate, InputSystem)                 → client-only (capture keyboard/mouse)
  ConductRegisterSystem(FixedUpdate, ClientNetworkReceiveSystem)  → receive server snapshots
  ConductRegisterSystem(FixedUpdate, ReconciliationSystem)        → merge server state into local world
  ConductRegisterSystem(FixedUpdate, MovementSystem)              → shared (client prediction)
  ConductRegisterSystem(FixedUpdate, CombatSystem)                → shared (client prediction)
  ConductRegisterSystem(Update, CameraSystem)                     → client-only, every frame
  ConductRegisterSystem(Update, RendererSystem)                   → client-only, every frame
  ConductRegisterSystem(FixedUpdate, ClientNetworkSendSystem)     → send commands to server
```

## Fixed Timestep — A Real Game Loop

This is not a "nice to have" — the engine is built on a **real game loop with fixed ticks**. Both client and server run simulation at a deterministic fixed tick rate. This is the foundational timing model for the entire engine, not just networking.

### Why fixed ticks are non-negotiable

- **Determinism**: Physics and game logic produce identical results regardless of frame rate. `deltaTime` during simulation is always exactly `TICK_DT` (e.g., 50ms at 20Hz). No frame-rate-dependent bugs.
- **Networking**: Server and client step in lockstep increments. Snapshots correspond to specific tick numbers. Commands reference specific ticks. Without fixed ticks, synchronization is undefined.
- **Reproducibility**: A given sequence of inputs at given ticks always produces the same output. This enables replay, debugging, and testing.
- **Decoupled rendering**: Rendering runs as fast as the display allows (requestAnimationFrame), completely independent of simulation rate. Visual interpolation between ticks gives smooth motion at any refresh rate.

### Tick rate

The simulation runs at **20 ticks/sec (50ms per tick)**. This is the authoritative simulation rate for both client and server. All game logic — movement, combat, economy, AI — advances in discrete 50ms steps.

### Schedules: FixedUpdate and Update

Following Bevy's model, every system is explicitly registered into a named schedule. The caller always says where a system runs — there is no default.

| Schedule | Runs | `deltaTime` | Use for |
|----------|------|-------------|---------|
| `FixedUpdate` | Once per tick (20Hz), 0–N times per frame | Always `TICK_DT` (50ms) | Game logic: movement, combat, economy, AI, networking |
| `Update` | Once per frame (variable rate) | Actual frame delta | Rendering, camera, UI, visual interpolation |

```typescript
// Server — only FixedUpdate systems, no rendering
ConductRegisterSystem(FixedUpdate, ServerNetworkReceiveSystem);
ConductRegisterSystem(FixedUpdate, MovementSystem);
ConductRegisterSystem(FixedUpdate, CombatSystem);
ConductRegisterSystem(FixedUpdate, AISystem);
ConductRegisterSystem(FixedUpdate, ServerNetworkSendSystem);
ConductStart(20);

// Client — FixedUpdate for simulation, Update for rendering
ConductRegisterSystem(FixedUpdate, ClientNetworkReceiveSystem);
ConductRegisterSystem(FixedUpdate, MovementSystem);
ConductRegisterSystem(FixedUpdate, CombatSystem);
ConductRegisterSystem(Update, CameraSystem);
ConductRegisterSystem(Update, RendererSystem);
ConductRegisterSystem(FixedUpdate, ClientNetworkSendSystem);
ConductStart(20);
```

### The game loop

One entry point: `ConductStart(tickRateHz)`. The engine detects the environment and runs the appropriate loop:

- **Browser** (`requestAnimationFrame` available): rAF outer loop. Each frame, the accumulator advances `FixedUpdate` systems 0–N times to catch up, then runs `Update` systems once.
- **Node.js** (no `requestAnimationFrame`): `setInterval` at the tick rate. Only `FixedUpdate` systems run (there should be no `Update` systems on the server).

Internally, the client loop looks like:

```typescript
const TICK_MS = 1000 / tickRateHz;
let accumulator = 0;
let tick = 0;

function frame(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += dt;

  // FixedUpdate: 0–N times per frame, deterministic step
  while (accumulator >= TICK_MS) {
    deltaTime = TICK_DT;  // always fixed
    runFixedUpdateSystems();
    tick++;
    accumulator -= TICK_MS;
  }

  // Update: once per frame, variable delta
  const alpha = accumulator / TICK_MS;
  deltaTime = dt / 1000;
  runUpdateSystems(alpha);
  requestAnimationFrame(frame);
}
```

The `alpha` value (0.0–1.0) tells `Update` systems how far between the last tick and the next tick we are, enabling smooth visual interpolation even at low tick rates.

### Changes needed to `@conduct/ecs`

- Change `ConductRegisterSystem(system)` to `ConductRegisterSystem(schedule, system)` — schedule is always explicit (`FixedUpdate` or `Update`), Bevy-style
- Change `ConductStart()` to `ConductStart(tickRateHz)` — one entry point, engine auto-detects environment
- Expose a global `tick` counter incremented each fixed step
- Make `deltaTime` always equal to `TICK_DT` (1000/tickRate ms) during `FixedUpdate` systems — never variable, never frame-rate-dependent
- Pass interpolation `alpha` to `Update` systems so they can interpolate between tick states

## Component Replication (Bevy replicon-style)

Two-level opt-in system inspired by Bevy's replicon plugin:

### Level 1: Register component types eligible for replication

At app setup, declare which component classes can be replicated. Unregistered component types are never serialized, even if present on a replicated entity.

```typescript
// In app setup (both client and server)
ConductReplicateComponent(Transform3D);
ConductReplicateComponent(UnitState);
ConductReplicateComponent(Health);
// MeshRenderer, Camera, Material, ParticleEmitter — NOT registered, never sent
```

### Level 2: Mark individual entities with a `Replicated` tag component

Only entities with the `Replicated` marker are synced over the network. This gives per-entity control — the same component type (e.g., Transform3D) can exist on both replicated and non-replicated entities.

```typescript
// Synced to clients — has Replicated tag
const soldier = ConductSpawnEntity();
ConductAddComponent(soldier, Transform3D, { x: 5, z: 10 });
ConductAddComponent(soldier, UnitState, { speed: 3 });
ConductAddComponent(soldier, Health, { current: 100, max: 100 });
ConductAddComponent(soldier, MeshRenderer, { meshId: soldierMesh });
ConductAddComponent(soldier, Replicated);  // ← networking marker

// NOT synced — no Replicated tag (client-only visual)
const particles = ConductSpawnEntity();
ConductAddComponent(particles, Transform3D, { x: 5, z: 10 });
ConductAddComponent(particles, ParticleEmitter, { rate: 50 });

// NOT synced — no Replicated tag (client-only camera)
const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D);
ConductAddComponent(camera, Camera, { fov: 60 });
```

### How the networking layer uses this

The server snapshot system does: "for every entity with `Replicated`, serialize all components on that entity whose type was registered with `ConductReplicateComponent()`." Components present on the entity but not registered (e.g., MeshRenderer on the soldier) are silently skipped.

This means:
- **Game units, buildings, resources** → spawn with `Replicated`, synced across all clients
- **Client-only visuals** (particles, selection highlights, camera rigs) → no `Replicated`, never touch the network
- **Server-only state** (AI internals) → server simply never adds `Replicated` to those entities, or uses unregistered component types that are never serialized

The `Replicated` tag is just a regular empty component, so it works with the existing query system — the server networking system can query `Query<[Replicated, Transform3D]>` to efficiently find all entities it needs to snapshot.

## State Synchronization Protocol

### Client → Server: Commands

Commands are high-level game actions, not raw input:

```typescript
interface GameCommand {
  type: 'move' | 'attack' | 'build' | 'gather' | 'stop';
  playerId: number;
  tick: number;           // client's current tick
  entityIds: number[];    // server entity IDs
  target?: { x: number, y: number, z: number };
  buildingType?: string;
}
```

### Server → Client: Snapshots

The server sends periodic state snapshots (every N ticks, e.g., every 3 ticks = ~150ms):

```typescript
interface Snapshot {
  tick: number;
  // Full snapshot (sent on connect or periodically for resync)
  entities?: SerializedEntity[];
  // Delta snapshot (sent most frames — only changed components)
  changes?: ComponentDelta[];
  // Entity lifecycle
  spawned?: SerializedEntity[];
  destroyed?: number[];  // server entity IDs
  // Confirmed commands
  confirmedCommands?: number[];  // command sequence numbers
}
```

Delta compression: only send components that changed since last snapshot. Track dirty flags per component per entity on the server.

### Serialization

Binary protocol for snapshots (ArrayBuffer-based), JSON for commands (sparse, human-debuggable during development, switch to binary later if needed).

For component serialization, auto-generate serializers from component class definitions — each component's fields are known at compile time. The networking package can provide a `serializeComponent(entity, ComponentClass)` and `deserializeComponent(buffer, ComponentClass)` pair.

## Entity Identity

Server entity IDs are authoritative. When the server spawns an entity and sends it to clients, the client creates a local entity and maintains a mapping:

```typescript
// In @conduct/networking on the client
const serverToLocal = new Map<number, number>();  // server ID → local entity ID
const localToServer = new Map<number, number>();  // local entity ID → server ID
```

When the client sends a command referencing entities, it translates local IDs to server IDs. When the server sends snapshots, the client translates server IDs to local IDs.

For client-predicted spawns (e.g., fire a bullet), the client assigns a temporary local ID and the server confirms with the real server ID once validated.

## Transport Layer

WebSocket for the MVP. It's simple, reliable, browser-native, and sufficient for RTS command rates.

```typescript
// In @conduct/networking
interface NetworkTransport {
  send(message: ArrayBuffer | string): void;
  onMessage(handler: (message: ArrayBuffer | string) => void): void;
  onConnect(handler: () => void): void;
  onDisconnect(handler: () => void): void;
  disconnect(): void;
}

// Implementations
class WebSocketClientTransport implements NetworkTransport { ... }
class WebSocketServerTransport implements NetworkTransport { ... }
```

Server uses `ws` package (Node.js WebSocket). Client uses native `WebSocket` API.

## Changes to Core ECS

Minimal changes required:

1. **Fixed timestep + schedules**: `ConductRegisterSystem(schedule, system)` with `FixedUpdate`/`Update` schedules, `ConductStart(tickRateHz)` with accumulator loop
2. **Tick counter**: Global `tick: number` incremented each fixed step (alongside existing `time` and `deltaTime`)
4. **Entity events**: Expose hooks for entity spawn/destroy so the networking layer can track lifecycle without polling

No changes to the compiler, query system, archetype storage, or component model.

## Concrete Example: How Game Code Looks

### Shared component (packages/simulation/src/components/)
```typescript
export class UnitState {
  speed = 0;
  targetX = 0;
  targetY = 0;
  targetZ = 0;
  hasTarget = false;
}
```

### Shared system (packages/simulation/src/systems/)
```typescript
export default function MovementSystem(
  query: Query<[Transform3D, UnitState]>
) {
  query.iter(([entity, transform, unit]) => {
    if (!unit.hasTarget) return;
    const dx = unit.targetX - transform.x;
    const dz = unit.targetZ - transform.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) { unit.hasTarget = false; return; }
    const step = unit.speed * deltaTime;
    transform.x += (dx / dist) * step;
    transform.z += (dz / dist) * step;
  });
}
```
This system runs on both client (prediction) and server (authority) with zero code differences.

### Client-only: sending commands (packages/examples/)
```typescript
export default function PlayerCommandSystem(
  query: Query<[PlayerSelected, Transform3D]>
) {
  query.iter(([entity, selected, transform]) => {
    if (Inputs.getMouseEvent(2)) {  // Right-click
      const target = raycastToGround(Inputs.getMousePosition());
      sendCommand({
        type: 'move',
        playerId: localPlayerId,
        tick: currentTick,
        entityIds: [localToServer.get(entity)!],
        target,
      });
    }
  });
}
```

### Server-only: processing commands (packages/server/)
```typescript
export default function CommandProcessingSystem(
  query: Query<[UnitState, NetworkAuthority]>
) {
  for (const cmd of pendingCommands) {
    if (cmd.type === 'move') {
      for (const serverId of cmd.entityIds) {
        const unit = getComponent(serverId, UnitState);
        if (unit) {
          unit.targetX = cmd.target.x;
          unit.targetY = cmd.target.y;
          unit.targetZ = cmd.target.z;
          unit.hasTarget = true;
        }
      }
    }
  }
  pendingCommands.length = 0;
}
```

## Implementation Order

1. **Fixed timestep in ECS** — `FixedUpdate`/`Update` schedules, tick counter, `ConductStart(tickRateHz)`
2. **`@conduct/networking` package** — transport interface, WebSocket impl, serialization
3. **`@conduct/server` package** — Node.js entry point, server tick loop, connection management
4. **Component replication** — dirty tracking, snapshot generation, delta compression
5. **Entity ID mapping** — server/client ID translation layer
6. **Client reconciliation** — receive snapshots, merge into local world
7. **Command pipeline** — client sends commands, server validates and applies
8. **Wire it together** — example game with 2 clients connecting to a server

---

## Where Netcode Is Actually Hard (Failure Modes)

The plan above reads clean because it describes the steady-state. The real difficulty is in the edge cases. Here's an honest breakdown:

### 1. Latency and "Feel" — The Core Problem

Even at 50ms one-way latency (good internet), a command round-trip is 100ms+. Player clicks "move units" → nothing happens for 100ms → units start moving. For an RTS this is tolerable (you're commanding units, not aiming a gun), but it still feels sluggish compared to single-player.

**The tempting solution:** client-side prediction — apply the command locally immediately, then reconcile when the server confirms.

**Why prediction is a can of worms:**
- Easy case: predicting movement (just run MovementSystem locally). This works.
- Hard case: predicting combat outcomes. Client doesn't know what other player commanded, what the AI is doing, or what random rolls the server made. Prediction is wrong → visual "snap" when server corrects.
- Harder case: predicting entity spawns. Client spawns a predicted bullet/building, server rejects the command (insufficient resources, invalid placement). Now the client must despawn something the player already saw.
- Rollback: when prediction is wrong, the "correct" fix is to rewind simulation N ticks and replay with server-confirmed state. This means storing snapshots of game state and re-running systems. Expensive and complex.

**MVP simplification:** For co-op RTS, skip prediction entirely. Commands feel ~100ms delayed, which is acceptable for RTS (Age of Empires online plays fine at higher latencies). Just wait for server confirmation. Add prediction later only if it feels bad.

### 2. State Reconciliation — When Server and Client Disagree

Even without prediction, the client needs to apply server snapshots to its local world. This sounds simple but:

- **Entity creation order differs**: Server spawns entity 47, client creates local entity 12 to represent it. Fine. But what if the client already has a local entity 12? The EntityMap handles this, but bugs in the mapping cause entities to "possess" each other — unit A starts rendering unit B's model at unit A's position.
- **Component data races**: Server snapshot says unit HP=50. Between receiving that snapshot and the next one, the client is showing stale HP. If the client runs combat prediction, it might show HP=30 while server says HP=50. Visual contradiction.
- **Snap vs interpolate**: When applying a server position update, just setting `transform.x = serverX` causes visual popping. Interpolating smoothly between current and server position looks better but means the client is always slightly behind truth. For an RTS at 20Hz tick rate, this manifests as units looking like they're "ice skating" — sliding to positions rather than crisply stopping.

**MVP simplification:** Just snap to server state. At 20Hz with ~200 entities, the visual artifacts are small (units move in 50ms increments). Add interpolation later. This is genuinely fine for an RTS — most competitive RTS games historically had worse update rates.

### 3. Clock Synchronization — Whose Tick Is It?

Server runs at tick 100. Due to network latency and jitter, the client receives tick 100's snapshot when its own internal clock thinks it's tick 102. Questions:

- Should the client be "ahead" of the server (for prediction) or "behind" (for interpolation)?
- Network jitter means sometimes packets arrive 40ms apart, sometimes 80ms. The client's simulation ticks need to be smooth regardless.
- If client clock drifts from server clock, commands arrive at the server targeting the wrong tick.

**The real solution:** An NTP-like clock sync protocol. Client periodically pings server, measures round-trip time, estimates one-way latency, adjusts its tick counter.

**MVP simplification:** Server includes its tick number in every snapshot. Client just uses server's tick as ground truth and doesn't try to predict ahead. Commands include "the tick I last received from the server" so the server knows the client's lag. No local tick simulation.

### 4. Bandwidth Scaling

The math in the plan says ~7KB per snapshot for 200 entities. But:

- Mid-game RTS might have 400+ entities (units, buildings, projectiles, resources)
- Each entity might have 3-4 replicated components, not just Transform3D
- Full snapshots at 20Hz: 400 entities × 60 bytes × 20/sec = ~480KB/s per client
- That's pushing it for some internet connections, and wasteful (most entities didn't change)

**Delta compression** is essential for production but complex:
- Track per-entity, per-component dirty flags on server
- Only serialize changed fields since last acknowledged snapshot
- Client must acknowledge received snapshots so server knows what baseline to diff against
- Lost packets mean the server doesn't know what the client has — must fall back to full snapshot

**MVP simplification:** Send full snapshots but at lower rate (10Hz instead of 20Hz). 400 entities × 60 bytes × 10/sec = ~240KB/s. Acceptable for local network and most internet. Add delta compression when entity count grows.

### 5. Connection Lifecycle — The Unglamorous Stuff

- **Join mid-game**: Client connects, needs full world state. Simple, but the full snapshot might be large and must be sent atomically (partial state = corrupted world).
- **Disconnect**: Player 2 drops. What happens to their units? Options: units continue with last command, units stop, AI takes over. All require design decisions and code.
- **Reconnect**: Player reconnects. Need to send full snapshot + reassign player identity. What if the game progressed? Player might not recognize the state.
- **Duplicate connections**: Same player opens two tabs. Server needs to reject or handle.
- **Graceful vs ungraceful disconnect**: WebSocket `close` event vs network just dying. Timeout detection.

**MVP simplification:** No reconnection. Disconnect = game over (or pause until reconnect with a simple timeout). One connection per player, reject duplicates. This is fine for a co-op game between friends.

### 6. Command Validation — The Security/Integrity Layer

Server must validate every command:
- Does this player own these units? (Can't command opponent's units — less relevant in co-op but still needed for AI units)
- Is the target position valid? (On the map, not inside a wall)
- Does the player have enough resources for this build command?
- Is the command temporally valid? (Not commanding dead units, not building where something already exists)

If validation is too strict, legitimate commands get rejected and the player's units don't respond. If too loose, bugs or exploits corrupt game state.

**This is actually not that hard** for an RTS — commands are simple and validation rules are clear. But it's a lot of boilerplate code that's easy to get wrong.

### 7. System Determinism (Even Without Lockstep)

Even in server-authoritative mode, if the client runs prediction (same systems as server), results should roughly match. If they diverge wildly, every server snapshot causes large corrections → visual jitter.

Subtle sources of divergence:
- **Floating point**: `a + b + c` ≠ `a + (b + c)` in IEEE 754. V8 is deterministic within one engine version, but client and server must use the same JS engine for identical results.
- **Iteration order**: If systems iterate entities in archetype order, and client/server have entities in different archetypes (because client has render components the server doesn't), iteration order differs → different float accumulation → divergence.
- **Random numbers**: Any randomness (damage rolls, AI decisions) must be seeded identically or come from the server.

**MVP simplification:** No prediction = no divergence concern. Client just renders what the server tells it. This eliminates the entire class of determinism bugs.

---

## Complexity Tiers

### Tier 0: MVP (Co-op RTS between friends)
- **No client prediction** — wait for server confirmation (~100ms command delay, fine for RTS)
- **Full snapshots** at 10Hz — no delta compression, no dirty tracking
- **Snap to server state** — no interpolation, no visual smoothing
- **No reconnection** — disconnect = game paused/over
- **JSON serialization** — human-readable, easy to debug
- **No fog of war filtering** — send all entities (co-op, shared vision)
- **No clock sync protocol** — client just follows server tick numbers
- **Estimated difficulty**: Moderate. Mostly plumbing code. The hard parts (prediction, rollback, interpolation) are deferred.

### Tier 1: Polished (Playable over internet)
- **Visual interpolation** — smooth movement between server snapshots
- **Delta compression** — only send changed components (needs dirty tracking on server)
- **Basic clock sync** — ping measurement, adaptive tick buffering
- **Reconnection** — full state snapshot on reconnect
- **Binary serialization** — ArrayBuffer-based, ~4x smaller than JSON
- **Estimated difficulty**: Significant. Interpolation and delta compression each touch many systems.

### Tier 2: Production (Competitive-ready)
- **Client-side prediction** with server reconciliation and rollback
- **Fog of war filtering** — server only sends visible entities per player
- **Interest management** — prioritize nearby/important entities in snapshots
- **Lag compensation** — server rewinds state to validate commands at the client's perceived time
- **Estimated difficulty**: Hard. This is where most netcode complexity lives.

**Recommendation: Build Tier 0 first.** It's sufficient for the MVP co-op game, debuggable, and doesn't preclude upgrading to Tier 1/2 later. The architecture (server-authoritative, command-based, separate entry points) is the same across all tiers.

---

## Verification

- Server starts on a port, two browser tabs connect as clients
- Both clients see the same game world
- Player commands from one client are reflected on both clients
- Server runs AI that both clients observe
- Killing the server disconnects both clients gracefully
