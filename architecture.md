# ECS Network Engine — Architecture & Design

> **Audience:** AI coding agents assisting development  
> **Status:** Design / Pre-implementation  
> **Developer note:** Developer is strong in TypeScript, learning Rust. Prefer clear, well-commented Rust over clever Rust.

---

## 1. What We're Building

A general-purpose framework built on an ECS and a durable write-ahead log. Not exclusively a game engine — the ECS provides relationships and structure, the WAL provides storage and replication. There may be no game loop at all. The goal is to learn — not to ship a product.

The closest reference point is SpacetimeDB: a system where the database and the server are the same process, clients subscribe to state, and changes are pushed automatically. We are building a simpler version from scratch.

The developer has an existing TypeScript ECS implementation ([conductengine](https://github.com/bolanzach/conductengine/tree/main/packages/ecs)) that serves as the client-side ECS. The server is written in Rust.

---

## 2. Core Concept

The fundamental mental model: **the ECS world is a database**.

- Components are tables
- Entities are row keys
- Systems are stored procedures / logic that runs every tick
- Queries are archetypal lookups

Rather than treating the database and game server as separate concerns, they are the same process. **The log is the source of truth. All in-memory state is derived from the log.**

### The Log as Source of Truth (Event Sourcing)

Traditional: state is real, the log is a side effect.  
Ours: the log is real, state is a side effect.

- The Write-Ahead Log (WAL) on disk is the canonical database
- The in-memory ECS world is a materialized view of the WAL
- On server startup, the ECS world is rebuilt by replaying the WAL from the last snapshot
- Clients receive a filtered stream derived from the WAL over WebSockets
- Replicas consume the full WAL stream to maintain a hot standby

### What This Project Actually Is

This is not a better ECS (Bevy already exists). The interesting and novel part is the **replication layer**: how state changes flow from the server ECS to clients efficiently, atomically, and durably. The ECS is the state container. The WAL is the persistence primitive. The sync layer is the point.

---

## 3. Architecture

### High-Level

```
┌─────────────────────────────────────────────────┐
│               Server Process (Rust)             │
│                                                 │
│   Systems ──▶ ECS World (in-memory)             │
│                    │                            │
│               mutations                         │
│                    ▼                            │
│              WAL (disk)                         │
│                    │                            │
│         ┌──────────┴──────────┐                 │
│         ▼                     ▼                 │
│    Replica Server      WebSocket stream         │
│    (full stream)       (filtered per client)    │
└─────────────────────────────────────────────────┘

Client (TypeScript / Browser)
  WebSocket stream ──▶ local ECS ──▶ render loop
```

### The Mutation Pipeline

Every state change flows through this pipeline in order:

1. A system (or external input) produces a mutation
2. Mutation is appended to the WAL on disk (durable write)
3. Mutation is applied to the in-memory ECS world
4. Mutation is broadcast to subscribed clients over WebSockets

Steps 2, 3, and 4 happen in the same tick, in the same process. No file tailing needed — it is an in-process broadcast channel. This is conceptually similar to Debezium (CDC) but simpler because we control the WAL format.

### Tick Boundaries and Atomicity

Mutations within a single server tick are grouped together. Clients buffer until `TickEnd` then apply the full batch atomically. This prevents clients from observing inconsistent intermediate state.

```
TickStart(t=42)
  ComponentUpdated(entity_id, Position, { x: 0 → 5 })
  ComponentUpdated(entity_id, Health, { 100 → 80 })
  ComponentUpdated(entity_id, LastAttackedBy, { None → entity_2 })
TickEnd(t=42)
```

---

## 4. Technology Decisions

| Component | Decision |
|---|---|
| Server language | Rust |
| Client language | TypeScript (existing ECS impl) |
| Transport | WebSockets |
| Storage | Write-Ahead Log (WAL) on disk, append-only |
| Wire format | binary |
| Rendering | Out of scope for now |
| Async runtime | Tokio |
| WebSocket library | tokio-tungstenite or Axum with WS upgrade |

---

## 5. The ECS Layer (Server)

### ECS as a Database

| ECS Concept | Database Analogy |
|---|---|
| Entity | Row key / primary key |
| Component | Table (entity_id + typed data) |
| Archetype | A specific combination of component tables, stored contiguously in memory |
| Query | Iteration over archetypes that match a component set |
| System | Stored procedure that runs every tick |

### Archetype Storage

The in-memory ECS uses archetype-based storage for cache efficiency. Entities with the same set of components are stored in contiguous arrays. Systems iterate tightly packed memory — no pointer chasing, no cache misses. This is a read/query optimization and is invisible to the WAL.

### Change Detection and WAL Integration

Systems mutate ECS state directly. A change detection pass at the end of each tick identifies dirtied components, then flushes mutations to the WAL and broadcasts to clients. Systems do not need to know about the WAL — the interception is transparent at the framework level.

### Extending ECS for Point Lookups (Escape Hatches)

The ECS doesn't need to be a full database to cover occasional non-archetype access patterns. These are implemented as resources (singleton components) maintained by dedicated systems:

```rust
// Point lookup by user ID
struct PlayerIndex {
    map: HashMap<UserId, EntityId>
}

// A system keeps it in sync using change detection
fn sync_player_index(
    index: ResMut<PlayerIndex>,
    query: Query<(EntityId, &Player), Changed<Player>>
) {
    for (id, player) in query {
        index.map.insert(player.user_id, id);
    }
}
```

Other patterns follow the same approach: spatial queries use a quadtree resource, sorted access uses a BTreeMap resource. These are explicit, opt-in, and maintained by systems — not magic. Add them when a specific access pattern demands it, not upfront.

---

## 6. The WAL Layer

### What Goes In the WAL

The WAL stores **state diffs only** — not semantic events. It is infrastructure, not application logic.

- `ComponentUpdated(entity_id, component_type, new_value)`
- `ComponentAdded(entity_id, component_type, value)`
- `ComponentRemoved(entity_id, component_type)`
- `EntityCreated(entity_id)`
- `EntityDestroyed(entity_id)`
- `TickStart(tick_number)` / `TickEnd(tick_number)`

Domain events (`PlayerMoved`, `PlayerDamaged`, etc.) are **not** in the WAL. Those are the responsibility of the application layer built on top of the engine. The engine is infrastructure. Apps own semantics.

### Engine vs Application Separation

```
Engine layer:
  ComponentUpdated(e1, Position, {x:0 → x:5})  ← engine produces this

App layer:
  PlayerMoved, FootstepSound, AnimationTrigger  ← app derives these from diffs
```

The engine does not know what a "player" is.

### Snapshots

The server periodically writes a full snapshot of ECS world state to disk. On startup: load latest snapshot, replay only the WAL tail since that snapshot. New clients connecting receive the current state snapshot + any subsequent diffs.

### WAL Format

Use a compact binary format (MessagePack, FlatBuffers, or custom) when performance matters.

---

## 7. The Network Layer

### WebSockets

All client-server communication happens over WebSockets. One persistent connection per client. No REST API — the WebSocket stream is the entire interface.

### The Diff Stream

The server pushes a filtered, serialized stream of component diffs to each client. In the initial implementation, every client gets all diffs. Subscription filtering is a future optimization (see Section 9).

### Consistency Model

Server is the single authoritative source of truth. Clients are read-only views. No client-side prediction in the initial implementation. This will feel laggy at real-world latency — client-side prediction is a known future extension.

### Client Reconnection

Send a full state snapshot on reconnect. Optimize to WAL-tail-since-disconnect later.

---

## 8. The Client Layer (TypeScript)

### Client ECS

The client runs the developer's existing TypeScript ECS. It is a materialized view of server state — rebuilt from the diff stream. It does not run simulation systems. It applies incoming diffs and drives the render loop. Think of it as a read-only replica optimized for rendering.

### Applying Diffs

On receiving `TickEnd`, the client applies the full buffered batch of diffs to its local ECS in one pass, then triggers a render. The client never renders partial-tick state.

### Domain Events

The engine delivers raw state diffs. The application derives domain events from those diffs and is responsible for triggering animations, sounds, UI updates, etc.

---

## 9. Future: Client-Side Predicate Queries (Interesting, Deferred)

This is one of the more compelling ideas to explore after the basic replication layer is working.

### The Concept

Client ECS queries look like normal component queries, but some components are **virtual predicates** evaluated server-side rather than stored on entities:

```typescript
// Normal query — Position is a real stored component
query([Position])

// Predicate query — Visible is a server-side filter, not a stored component
query([Position, Visible])
// "give me Position for all entities that are visible to this client"
```

`Visible` isn't stored anywhere. The server evaluates it per-client based on game state (line of sight, fog of war, range, etc.) and only streams diffs for entities that pass the predicate.

### Why This Is Powerful

Without this, you have two bad options:
- Stream everything to every client, filter locally → wasteful, leaks hidden state
- Write bespoke server-side filtering per use case → not composable

Predicate components give you composable server-side filtering expressed in the same query language as everything else. The client doesn't know or care that `Visible` is evaluated differently than `Position`.

### Real Components vs Predicate Components

| Type | Example | Stored? | Evaluated by |
|---|---|---|---|
| Real component | `Position`, `Health`, `Velocity` | Yes, on entity | Client queries directly |
| Predicate component | `Visible`, `InRange`, `OwnedByPlayer` | No | Server, per client, per tick |

### The Hard Part

The server must detect when predicate results change, not just when components change. If a player moves and a previously invisible entity enters line of sight, the server must:

1. Detect that visibility changed for this client
2. Send the newly visible entity's **full current state** (not a diff — client has never seen it)
3. When it becomes invisible again, tell the client to remove it

This is per-client incremental view maintenance. SpacetimeDB calls this `eval_incr()` internally. It is meaningfully harder than flat replication. Build flat replication first, then layer this on top.

---

## 10. Future: Replication & Failover

The WAL design makes replication straightforward. A replica is just another WAL consumer — it receives the full diff stream, applies it to its own in-memory ECS, and can take over on primary failure. Identical in concept to Postgres streaming replication. The replica does not re-simulate — it only applies log entries.

**Out of scope for initial implementation.** The WAL design should not preclude it.

---

## 11. Not Building Yet

- Client-side prediction / reconciliation
- Subscription filtering (all clients get all diffs initially)
- Replica / failover
- Authentication or authorization
- A rendering engine
- Rust → WASM client
- Predicate query system (Section 9)

---










## 12. Open Questions

| Question | Status |
|---|---|
| Client subscription filtering | All diffs initially, spatial filtering later |
| Snapshot cadence | TBD — time-based or size-based |
| New client onboarding | Full snapshot on connect |
| Tick rate | TBD — start at 20hz |
| Component schema / type sharing between Rust server and TS client | Likely code generation from Rust definitions |

---

## 13. Glossary

| Term | Definition |
|---|---|
| ECS | Entity Component System. Entities are IDs, components are pure data, systems are logic that operates on components. |
| Archetype | A unique combination of component types. Entities sharing the same components are stored contiguously for cache efficiency. |
| WAL | Write-Ahead Log. Append-only log written to disk before in-memory state is updated. Same concept as in Postgres. |
| Materialized View | A derived representation computed from a source. The in-memory ECS world is a materialized view of the WAL. |
| CDC / Change Data Capture | Pattern for streaming database changes as they happen. We implement an in-process equivalent. |
| Event Sourcing | The log of events is the source of truth. Current state is derived by replaying the log. |
| Tick | One iteration of the server simulation loop. Mutations within a tick are applied atomically on the client. |
| Diff / Delta | The change between two states. Server sends only what changed, not full state. |
| Replica | A server that consumes the WAL stream from the primary and maintains a copy of world state for failover. |
| Snapshot | A full checkpoint of ECS world state. Avoids replaying the entire WAL from t=0 on startup. |
| Predicate Component | A virtual component that represents a server-side filter rather than stored entity data. Evaluated per-client. |
| Incremental View Maintenance | Efficiently updating query results as underlying data changes, rather than re-evaluating full queries. |

---

*Living document — update as implementation decisions are made.*
