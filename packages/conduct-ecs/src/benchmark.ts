import { addComponent, registerSystem, spawnEntity, startConduct } from "./core.js";
import BasicSystem from "./basicSystem.js";
import FooSystem from "./fooSystem.js";
import BarSystem from "./barSystem.js";
import BazSystem from "./bazSystem.js";
import TestSystem from "./testSystem.js";
import PersonSystem from "./personSystem.js";
import { Person, ValueA, ValueB, ValueC, ValueD, ValueE } from "./basicComponents.js";

console.log('CONDUCT ENGINE Main Benchmark');

const runBasicSystem = registerSystem(BasicSystem);
const runFooSystem = registerSystem(FooSystem);
const runBarSystem = registerSystem(BarSystem);
const runBazSystem = registerSystem(BazSystem);
const runTestSystem = registerSystem(TestSystem);

function execute() {
  runBarSystem();
  runFooSystem();
  runBazSystem();
  runBasicSystem();
  runTestSystem();
}

const ITERATIONS = 1_000;
const NUM_ENTITIES = 1_000;

for (let i = 0; i < NUM_ENTITIES; i++) {
  const a = spawnEntity();
  addComponent(a, ValueA);

  const b = spawnEntity();
  addComponent(b, ValueB);

  const c = spawnEntity();
  addComponent(c, ValueC);

  const d = spawnEntity();
  addComponent(d, ValueD);

  const e = spawnEntity();
  addComponent(e, ValueE);
}

// Warm up
for (let i = 0; i < 10; i++) {
  execute();
}

console.log("Starting benchmark...");
const startTime = performance.now();

startConduct();

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

const runPersonSystem = registerSystem(PersonSystem);

const p = spawnEntity();
addComponent(p, [Person, { age: 100, name: 'a', someArray: [1] }]);

runPersonSystem();
