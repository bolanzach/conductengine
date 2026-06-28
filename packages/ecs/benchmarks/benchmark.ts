import { ConductAddComponent, ConductRegisterSystem, ConductUnregisterSystem, ConductSpawnEntity, ConductBenchmarkStart, FixedUpdate } from "@conduct/ecs";
import BasicSystem from "../dist/basicSystem.js";
import FooSystem from "../dist/fooSystem.js";
import BarSystem from "../dist/barSystem.js";
import BazSystem from "../dist/bazSystem.js";
import TestSystem from "../dist/testSystem.js";
import PersonSystem from "../dist/personSystem.js";
import { Person, Position, ValueA, ValueB, ValueC, ValueD, ValueE, Velocity } from "../dist/basicComponents.js";
import PhysicsSystem from "../dist/physicsSystem.js";
import GetLookupSystem from "../dist/getLookupSystem.js";

console.log('CONDUCT ENGINE Main Benchmark');

ConductRegisterSystem(FixedUpdate, BasicSystem);
ConductRegisterSystem(FixedUpdate, FooSystem);
ConductRegisterSystem(FixedUpdate, BarSystem);
ConductRegisterSystem(FixedUpdate, BazSystem);
ConductRegisterSystem(FixedUpdate, TestSystem);

ConductRegisterSystem(FixedUpdate, PersonSystem);
ConductRegisterSystem(FixedUpdate, PhysicsSystem);

const ITERATIONS = 1_000;
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
  ConductAddComponent(d, ValueD, { y: 10});
  entityIds.push(d);

  const e = ConductSpawnEntity();
  ConductAddComponent(e, ValueE);
  entityIds.push(e);
}

// Warm up
ConductBenchmarkStart(100);

console.log("Starting benchmark...");
const startTime = performance.now();

ConductBenchmarkStart(1_000);

const endTime = performance.now();
const totalMs = endTime - startTime;

console.log("");
console.log(
  "=== ConductEngine Benchmark ==="
);
console.log(`Total time: ${totalMs.toFixed(2)} ms`);
console.log(`Average per iteration: ${(totalMs / ITERATIONS).toFixed(4)} ms`);
console.log(
  `Iterations per second: ${(1000 / (totalMs / ITERATIONS)).toFixed(2)}`
);

// CONDUCT ENGINE Main Benchmark
// Starting benchmark...
//
// === ConductEngine Benchmark ===
// Total time: 5.45 ms
// Average per iteration: 0.0054 ms
// Iterations per second: 183567.61

// === query.get() Point-Lookup Benchmark ===
ConductUnregisterSystem(FixedUpdate, BasicSystem);
ConductUnregisterSystem(FixedUpdate, FooSystem);
ConductUnregisterSystem(FixedUpdate, BarSystem);
ConductUnregisterSystem(FixedUpdate, BazSystem);
ConductUnregisterSystem(FixedUpdate, TestSystem);
ConductUnregisterSystem(FixedUpdate, PersonSystem);
ConductUnregisterSystem(FixedUpdate, PhysicsSystem);

ConductRegisterSystem(FixedUpdate, GetLookupSystem);

// Warm up
ConductBenchmarkStart(100);

const getLookupStart = performance.now();
ConductBenchmarkStart(ITERATIONS);
const getLookupEnd = performance.now();
const getLookupMs = getLookupEnd - getLookupStart;

console.log("");
console.log("=== query.get() Point-Lookup Benchmark ===");
console.log(`${ITERATIONS} random lookups across ${NUM_ENTITIES * 5} entities`);
console.log(`Total time: ${getLookupMs.toFixed(2)} ms`);
console.log(`Average per iteration: ${(getLookupMs / ITERATIONS).toFixed(4)} ms`);
console.log(`Iterations per second: ${(1000 / (getLookupMs / ITERATIONS)).toFixed(2)}`);

// === query.get() Point-Lookup Benchmark ===
// 1000 random lookups across 5000 entities
// Total time: 0.18 ms
// Average per iteration: 0.0002 ms
// Iterations per second: 5532503.46

ConductUnregisterSystem(FixedUpdate, GetLookupSystem);

console.log('Other tests...')

const p = ConductSpawnEntity();
ConductAddComponent(p, Person, { age: 100, name: 'a', someArray: [1] });
ConductAddComponent(p, Position);
ConductAddComponent(p, Velocity, { x: 1, y: 1, z: 1 });

ConductBenchmarkStart();
