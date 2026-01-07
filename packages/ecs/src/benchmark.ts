import { ConductAddComponent, ConductRegisterSystem, ConductSpawnEntity, ConductBenchmarkStart } from "./core.js";
import BasicSystem from "./basicSystem.js";
import FooSystem from "./fooSystem.js";
import BarSystem from "./barSystem.js";
import BazSystem from "./bazSystem.js";
import TestSystem from "./testSystem.js";
import PersonSystem from "./personSystem.js";
import { Person, Position, ValueA, ValueB, ValueC, ValueD, ValueE, Velocity } from "./basicComponents.js";
import PhysicsSystem from "./physicsSystem.js";

console.log('CONDUCT ENGINE Main Benchmark');

ConductRegisterSystem(BasicSystem);
ConductRegisterSystem(FooSystem);
ConductRegisterSystem(BarSystem);
ConductRegisterSystem(BazSystem);
ConductRegisterSystem(TestSystem);

ConductRegisterSystem(PersonSystem);
ConductRegisterSystem(PhysicsSystem);

const ITERATIONS = 1_000;
const NUM_ENTITIES = 1_000;

for (let i = 0; i < NUM_ENTITIES; i++) {
  const a = ConductSpawnEntity();
  ConductAddComponent(a, ValueA);

  const b = ConductSpawnEntity();
  ConductAddComponent(b, ValueB, { x: 100 });

  const c = ConductSpawnEntity();
  ConductAddComponent(c, ValueC);

  const d = ConductSpawnEntity();
  ConductAddComponent(d, ValueD, { y: 10});

  const e = ConductSpawnEntity();
  ConductAddComponent(e, ValueE);
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
// Total time: 9.68 ms
// Average per iteration: 0.0097 ms
// Iterations per second: 103313.79

console.log('Other tests...')

const p = ConductSpawnEntity();
ConductAddComponent(p, Person, { age: 100, name: 'a', someArray: [1] });
ConductAddComponent(p, Position);
ConductAddComponent(p, Velocity, { x: 1, y: 1, z: 1 });

ConductBenchmarkStart();
