import {
  ConductAddComponent,
  ConductRegisterSystem,
  ConductUnregisterSystem,
  ConductSpawnEntity,
  ConductDeleteEntity,
  ConductRemoveComponent,
  ConductBenchmarkStart,
  FixedUpdate,
} from "@conduct/ecs";
import BasicSystem from "../dist/basicSystem.js";
import FooSystem from "../dist/fooSystem.js";
import BarSystem from "../dist/barSystem.js";
import BazSystem from "../dist/bazSystem.js";
import TestSystem from "../dist/testSystem.js";
import PersonSystem from "../dist/personSystem.js";
import PhysicsSystem from "../dist/physicsSystem.js";
import GetLookupSystem from "../dist/getLookupSystem.js";
import HeavyIterSystem from "../dist/heavyIterSystem.js";
import TripleQuerySystem from "../dist/tripleQuerySystem.js";
import OptionalQuerySystem from "../dist/optionalQuerySystem.js";
import TestTwoSystem from "../dist/testTwoSystem.js";
import {
  ValueA,
  ValueB,
  ValueC,
  ValueD,
  ValueE,
  Position,
  Velocity,
  Health,
  Armor,
} from "../dist/basicComponents.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// Benchmark Harness
// ============================================================================

interface BenchmarkResult {
  name: string;
  entityCount: number;
  iterations: number;
  totalMs: number;
  avgPerIterationMs: number;
  iterationsPerSecond: number;
  opsPerSecond?: number;
}

const results: BenchmarkResult[] = [];

function recordResult(
  name: string,
  entityCount: number,
  iterations: number,
  totalMs: number,
  opsPerSecond?: number,
): BenchmarkResult {
  const avgPerIterationMs = totalMs / iterations;
  const iterationsPerSecond = 1000 / avgPerIterationMs;

  const result: BenchmarkResult = {
    name,
    entityCount,
    iterations,
    totalMs: +totalMs.toFixed(4),
    avgPerIterationMs: +avgPerIterationMs.toFixed(6),
    iterationsPerSecond: +iterationsPerSecond.toFixed(2),
  };
  if (opsPerSecond !== undefined) {
    result.opsPerSecond = +opsPerSecond.toFixed(2);
  }
  results.push(result);

  console.log(`  Total time: ${totalMs.toFixed(2)} ms`);
  console.log(`  Avg per iteration: ${avgPerIterationMs.toFixed(4)} ms`);
  console.log(`  Iterations/sec: ${iterationsPerSecond.toFixed(2)}`);
  if (opsPerSecond !== undefined) {
    console.log(`  Ops/sec: ${opsPerSecond.toFixed(2)}`);
  }

  return result;
}

const ITERATIONS = 1_000;
const WARMUP = 100;

console.log("CONDUCT ENGINE Benchmarks");
console.log("=".repeat(60));

// ============================================================================
// 1. System Iteration Benchmark (5k entities, 7 systems)
// ============================================================================

console.log("");
console.log("1. System Iteration (5k entities, 7 systems)");
console.log("-".repeat(60));

ConductRegisterSystem(FixedUpdate, BasicSystem);
ConductRegisterSystem(FixedUpdate, FooSystem);
ConductRegisterSystem(FixedUpdate, BarSystem);
ConductRegisterSystem(FixedUpdate, BazSystem);
ConductRegisterSystem(FixedUpdate, TestSystem);
ConductRegisterSystem(FixedUpdate, PersonSystem);
ConductRegisterSystem(FixedUpdate, PhysicsSystem);

const NUM_ENTITIES = 1_000;
const entityIds: number[] = [];

for (let i = 0; i < NUM_ENTITIES; i++) {
  const a = ConductSpawnEntity();
  ConductAddComponent(a, ValueA);
  entityIds.push(a);

  const b = ConductSpawnEntity();
  ConductAddComponent(b, ValueB, { x: 100 });
  entityIds.push(b);

  const c = ConductSpawnEntity();
  ConductAddComponent(c, ValueC);
  entityIds.push(c);

  const d = ConductSpawnEntity();
  ConductAddComponent(d, ValueD, { y: 10 });
  entityIds.push(d);

  const e = ConductSpawnEntity();
  ConductAddComponent(e, ValueE);
  entityIds.push(e);
}

// Flush initial entities
ConductBenchmarkStart(0);

// Warm up
ConductBenchmarkStart(WARMUP);

const startTime = performance.now();
ConductBenchmarkStart(ITERATIONS);
const endTime = performance.now();

recordResult(
  "System Iteration (5k entities, 7 systems)",
  NUM_ENTITIES * 5,
  ITERATIONS,
  endTime - startTime,
);

ConductUnregisterSystem(FixedUpdate, BasicSystem);
ConductUnregisterSystem(FixedUpdate, FooSystem);
ConductUnregisterSystem(FixedUpdate, BarSystem);
ConductUnregisterSystem(FixedUpdate, BazSystem);
ConductUnregisterSystem(FixedUpdate, TestSystem);
ConductUnregisterSystem(FixedUpdate, PersonSystem);
ConductUnregisterSystem(FixedUpdate, PhysicsSystem);

// ============================================================================
// 2. query.get() Point-Lookup Benchmark
// ============================================================================

console.log("");
console.log("2. query.get() Point-Lookup");
console.log("-".repeat(60));

ConductRegisterSystem(FixedUpdate, GetLookupSystem);

ConductBenchmarkStart(WARMUP);

const getLookupStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const getLookupEnd = performance.now();

recordResult(
  "query.get() Point-Lookup (5k entities)",
  NUM_ENTITIES * 5,
  ITERATIONS,
  getLookupEnd - getLookupStart,
);

ConductUnregisterSystem(FixedUpdate, GetLookupSystem);

// ============================================================================
// 3. Entity Spawn Benchmark
// ============================================================================

console.log("");
console.log("3. Entity Spawn (1 component)");
console.log("-".repeat(60));

const SPAWN_COUNT = 10_000;

// Warm up: spawn and flush a small batch
for (let i = 0; i < 100; i++) {
  const e = ConductSpawnEntity();
  ConductAddComponent(e, ValueA);
}
ConductBenchmarkStart(0);

const spawnStart = performance.now();
const spawnedIds: number[] = [];
for (let i = 0; i < SPAWN_COUNT; i++) {
  const e = ConductSpawnEntity();
  ConductAddComponent(e, ValueA);
  spawnedIds.push(e);
}
ConductBenchmarkStart(0); // flush
const spawnEnd = performance.now();
const spawnMs = spawnEnd - spawnStart;

recordResult(
  "Entity Spawn (1 component)",
  SPAWN_COUNT,
  SPAWN_COUNT,
  spawnMs,
  SPAWN_COUNT / (spawnMs / 1000),
);

// ============================================================================
// 4. Entity Spawn with Multiple Components
// ============================================================================

console.log("");
console.log("4. Entity Spawn (3 components)");
console.log("-".repeat(60));

const SPAWN_MULTI_COUNT = 10_000;

const spawnMultiStart = performance.now();
const spawnedMultiIds: number[] = [];
for (let i = 0; i < SPAWN_MULTI_COUNT; i++) {
  const e = ConductSpawnEntity();
  ConductAddComponent(e, Position, { x: i, y: 0, z: 0 });
  ConductAddComponent(e, Velocity, { x: 1, y: 0, z: 0 });
  ConductAddComponent(e, Health);
  spawnedMultiIds.push(e);
}
ConductBenchmarkStart(0); // flush
const spawnMultiEnd = performance.now();
const spawnMultiMs = spawnMultiEnd - spawnMultiStart;

recordResult(
  "Entity Spawn (3 components)",
  SPAWN_MULTI_COUNT,
  SPAWN_MULTI_COUNT,
  spawnMultiMs,
  SPAWN_MULTI_COUNT / (spawnMultiMs / 1000),
);

// ============================================================================
// 5. Archetype Transition (Add Component)
// ============================================================================

console.log("");
console.log("5. Archetype Transition (add component)");
console.log("-".repeat(60));

// Add a new component (Armor) to entities that already have Position+Velocity+Health
// This forces archetype transitions
const TRANSITION_COUNT = 5_000;
const transitionTargets = spawnedMultiIds.slice(0, TRANSITION_COUNT);

const transitionStart = performance.now();
for (let i = 0; i < TRANSITION_COUNT; i++) {
  ConductAddComponent(transitionTargets[i]!, Armor);
}
ConductBenchmarkStart(0); // flush
const transitionEnd = performance.now();
const transitionMs = transitionEnd - transitionStart;

recordResult(
  "Archetype Transition (add component)",
  TRANSITION_COUNT,
  TRANSITION_COUNT,
  transitionMs,
  TRANSITION_COUNT / (transitionMs / 1000),
);

// ============================================================================
// 6. Archetype Transition (Remove Component)
// ============================================================================

console.log("");
console.log("6. Archetype Transition (remove component)");
console.log("-".repeat(60));

// Remove the Armor component we just added
const removeTransitionStart = performance.now();
for (let i = 0; i < TRANSITION_COUNT; i++) {
  ConductRemoveComponent(transitionTargets[i]!, Armor);
}
ConductBenchmarkStart(0); // flush
const removeTransitionEnd = performance.now();
const removeTransitionMs = removeTransitionEnd - removeTransitionStart;

recordResult(
  "Archetype Transition (remove component)",
  TRANSITION_COUNT,
  TRANSITION_COUNT,
  removeTransitionMs,
  TRANSITION_COUNT / (removeTransitionMs / 1000),
);

// ============================================================================
// 7. Entity Deletion
// ============================================================================

console.log("");
console.log("7. Entity Deletion");
console.log("-".repeat(60));

// Delete the spawned single-component entities
const DELETE_COUNT = 5_000;
const deleteTargets = spawnedIds.slice(0, DELETE_COUNT);

const deleteStart = performance.now();
for (let i = 0; i < DELETE_COUNT; i++) {
  ConductDeleteEntity(deleteTargets[i]!);
}
ConductBenchmarkStart(0); // flush
const deleteEnd = performance.now();
const deleteMs = deleteEnd - deleteStart;

recordResult(
  "Entity Deletion",
  DELETE_COUNT,
  DELETE_COUNT,
  deleteMs,
  DELETE_COUNT / (deleteMs / 1000),
);

// ============================================================================
// 8. Component Update (overwrite existing data)
// ============================================================================

console.log("");
console.log("8. Component Update (overwrite fields)");
console.log("-".repeat(60));

// Update Position data on existing entities (no archetype transition)
const UPDATE_COUNT = 5_000;
const updateTargets = spawnedMultiIds.slice(0, UPDATE_COUNT);

const updateStart = performance.now();
for (let i = 0; i < UPDATE_COUNT; i++) {
  ConductAddComponent(updateTargets[i]!, Position, { x: i * 2, y: i * 3 });
}
ConductBenchmarkStart(0); // flush
const updateEnd = performance.now();
const updateMs = updateEnd - updateStart;

recordResult(
  "Component Update (overwrite fields)",
  UPDATE_COUNT,
  UPDATE_COUNT,
  updateMs,
  UPDATE_COUNT / (updateMs / 1000),
);

// ============================================================================
// 9. Multi-Component Query (3 components)
// ============================================================================

console.log("");
console.log("9. Triple Query Iteration (10k entities, 3 components)");
console.log("-".repeat(60));

// We have 10k entities with Position+Velocity+Health from benchmark 4
ConductRegisterSystem(FixedUpdate, TripleQuerySystem);

ConductBenchmarkStart(WARMUP);

const tripleStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const tripleEnd = performance.now();

recordResult(
  "Triple Query Iteration (10k entities, 3 components)",
  SPAWN_MULTI_COUNT,
  ITERATIONS,
  tripleEnd - tripleStart,
);

ConductUnregisterSystem(FixedUpdate, TripleQuerySystem);

// ============================================================================
// 10. Heavy Computation Per Entity
// ============================================================================

console.log("");
console.log("10. Heavy Iteration (10k entities, arithmetic-heavy)");
console.log("-".repeat(60));

// Uses Position+Velocity entities (10k from benchmark 4)
ConductRegisterSystem(FixedUpdate, HeavyIterSystem);

ConductBenchmarkStart(WARMUP);

const heavyStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const heavyEnd = performance.now();

recordResult(
  "Heavy Iteration (10k entities, arithmetic-heavy)",
  SPAWN_MULTI_COUNT,
  ITERATIONS,
  heavyEnd - heavyStart,
);

ConductUnregisterSystem(FixedUpdate, HeavyIterSystem);

// ============================================================================
// 11. Optional Query
// ============================================================================

console.log("");
console.log("11. Optional Query Iteration");
console.log("-".repeat(60));

// Spawn entities with only Position (no Velocity) to create a mixed population
const POSITION_ONLY_COUNT = 5_000;
for (let i = 0; i < POSITION_ONLY_COUNT; i++) {
  const e = ConductSpawnEntity();
  ConductAddComponent(e, Position, { x: i, y: 0 });
}
ConductBenchmarkStart(0); // flush

ConductRegisterSystem(FixedUpdate, OptionalQuerySystem);

ConductBenchmarkStart(WARMUP);

const optionalStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const optionalEnd = performance.now();

recordResult(
  "Optional Query Iteration (15k entities, mixed)",
  SPAWN_MULTI_COUNT + POSITION_ONLY_COUNT,
  ITERATIONS,
  optionalEnd - optionalStart,
);

ConductUnregisterSystem(FixedUpdate, OptionalQuerySystem);

// ============================================================================
// 12. Not Filter Query
// ============================================================================

console.log("");
console.log("12. Not Filter Iteration");
console.log("-".repeat(60));

// TestTwoSystem queries ValueA, Not<ValueE>, ValueB
// Need entities with both ValueA and ValueB (but not ValueE)
const NOT_ENTITY_COUNT = 5_000;
for (let i = 0; i < NOT_ENTITY_COUNT; i++) {
  const e = ConductSpawnEntity();
  ConductAddComponent(e, ValueA);
  ConductAddComponent(e, ValueB);
}
ConductBenchmarkStart(0); // flush

ConductRegisterSystem(FixedUpdate, TestTwoSystem);

ConductBenchmarkStart(WARMUP);

const notStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const notEnd = performance.now();

recordResult(
  "Not Filter Iteration (5k matching entities)",
  NOT_ENTITY_COUNT,
  ITERATIONS,
  notEnd - notStart,
);

ConductUnregisterSystem(FixedUpdate, TestTwoSystem);

// ============================================================================
// 13. Scaling: Single System with Increasing Entity Counts
// ============================================================================

console.log("");
console.log("13. Scaling: Single System Iteration");
console.log("-".repeat(60));

// Use a fresh component to isolate from prior entities
// We'll progressively add ValueD entities (which already have some from initial setup)
// Unregister everything, use BazSystem which queries ValueD

// First, count existing ValueD entities: 1k from initial setup
let currentValueDCount = NUM_ENTITIES; // 1k from initial setup

const scaleTargets = [10_000, 50_000, 100_000];

ConductRegisterSystem(FixedUpdate, BazSystem);

for (const target of scaleTargets) {
  const toSpawn = target - currentValueDCount;
  if (toSpawn > 0) {
    for (let i = 0; i < toSpawn; i++) {
      const e = ConductSpawnEntity();
      ConductAddComponent(e, ValueD);
    }
    ConductBenchmarkStart(0); // flush
    currentValueDCount = target;
  }

  ConductBenchmarkStart(WARMUP);

  const scaleStart = performance.now();
  ConductBenchmarkStart(ITERATIONS);
  const scaleEnd = performance.now();

  console.log(`  --- ${target.toLocaleString()} entities ---`);
  recordResult(
    `Scaling: Single System (${target.toLocaleString()} entities)`,
    target,
    ITERATIONS,
    scaleEnd - scaleStart,
  );
}

ConductUnregisterSystem(FixedUpdate, BazSystem);

// ============================================================================
// 14. Archetype Fragmentation
// ============================================================================

console.log("");
console.log("14. Archetype Fragmentation");
console.log("-".repeat(60));

// Create many different archetypes by combining components in various ways
// This tests how well the engine handles many archetypes during query matching
const FRAG_ENTITY_COUNT = 1_000;
const fragComponents = [ValueA, ValueB, ValueC, ValueD, ValueE, Position, Velocity, Health];

// Create entities with different component combinations
for (let i = 0; i < FRAG_ENTITY_COUNT; i++) {
  const e = ConductSpawnEntity();
  // Each entity gets a unique-ish combination based on its index bits
  for (let bit = 0; bit < fragComponents.length; bit++) {
    if (i & (1 << bit)) {
      ConductAddComponent(e, fragComponents[bit]!);
    }
  }
  // Always add ValueA so BasicSystem matches
  ConductAddComponent(e, ValueA);
}
ConductBenchmarkStart(0); // flush

ConductRegisterSystem(FixedUpdate, BasicSystem);

ConductBenchmarkStart(WARMUP);

const fragStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const fragEnd = performance.now();

recordResult(
  "Fragmented Archetypes (many archetypes, BasicSystem)",
  FRAG_ENTITY_COUNT,
  ITERATIONS,
  fragEnd - fragStart,
);

ConductUnregisterSystem(FixedUpdate, BasicSystem);

// ============================================================================
// 15. Multiple Systems on Same Entities
// ============================================================================

console.log("");
console.log("15. Multiple Systems on Same Entities (10k entities)");
console.log("-".repeat(60));

// Register both PhysicsSystem and HeavyIterSystem which both query Position+Velocity
ConductRegisterSystem(FixedUpdate, PhysicsSystem);
ConductRegisterSystem(FixedUpdate, HeavyIterSystem);

ConductBenchmarkStart(WARMUP);

const multiSysStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const multiSysEnd = performance.now();

recordResult(
  "Multiple Systems on Same Entities (10k, 2 systems)",
  SPAWN_MULTI_COUNT,
  ITERATIONS,
  multiSysEnd - multiSysStart,
);

ConductUnregisterSystem(FixedUpdate, PhysicsSystem);
ConductUnregisterSystem(FixedUpdate, HeavyIterSystem);

// ============================================================================
// Write Results to File
// ============================================================================

console.log("");
console.log("=".repeat(60));
console.log("All benchmarks complete.");

const outputDir = join(import.meta.dirname!, "results");
try {
  mkdirSync(outputDir, { recursive: true });
} catch {
  // directory may already exist
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputFile = join(outputDir, `benchmark-${timestamp}.json`);

const output = {
  timestamp: new Date().toISOString(),
  runtime: `Node.js ${process.version}`,
  results,
};

writeFileSync(outputFile, JSON.stringify(output, null, 2));
console.log(`Results written to: ${outputFile}`);

// Also write a latest.json for easy comparison
const latestFile = join(outputDir, "latest.json");
writeFileSync(latestFile, JSON.stringify(output, null, 2));
console.log(`Latest results: ${latestFile}`);
