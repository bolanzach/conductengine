// ============ Regular JS Array Approach ============
const COUNT2 = 20_000;
const COUNT_1 = 40_000;

// Entity type 1: position + velocity
const rx: number[] = new Array(COUNT_1);
const ry: number[] = new Array(COUNT_1);
const rz: number[] = new Array(COUNT_1);
const rvx: number[] = new Array(COUNT_1);
const rvy: number[] = new Array(COUNT_1);
const rvz: number[] = new Array(COUNT_1);

// Entity type 2: value
const rvalue: number[] = new Array(COUNT2);

// Initialize
for (let i = 0; i < COUNT_1; i++) {
  rx[i] = Math.random() * 1000;
  ry[i] = Math.random() * 1000;
  rz[i] = Math.random() * 1000;
  rvx[i] = Math.random() * 2 - 1;
  rvy[i] = Math.random() * 2 - 1;
  rvz[i] = Math.random() * 2 - 1;
}
for (let i = 0; i < COUNT2; i++) {
  rvalue[i] = Math.random() * 1000;
}

{
  const times: number[] = [];
  for (let iter = 0; iter < 1000; iter++) {
    const start = performance.now();

    // Update positions
    for (let i = 0; i < COUNT_1; i++) {
      rx[i] += rvx[i];
      ry[i] += rvy[i];
      rz[i] += rvz[i];
    }

    // Update values
    for (let i = 0; i < COUNT2; i++) {
      rvalue[i] += rvx[i];
    }

    times.push(performance.now() - start);
  }
  const trimmed = times.slice(10);
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  console.log("Regular JS Array mean:", mean);
}

// ============ Archetype System ============

// Symbol for component type identification
const COMPONENT_TYPE = Symbol("COMPONENT_TYPE");

// Component ID counter for bitmask generation
let nextComponentId = 0;
const componentMasks = new Map<ComponentConstructor, number>();

type ComponentConstructor<T extends Component = Component> = new () => T;

abstract class Component {
  protected readonly [COMPONENT_TYPE]: ComponentConstructor = this
    .constructor as ComponentConstructor;

  // Get or assign a unique bitmask for this component type
  static getMask(ctor: ComponentConstructor): number {
    let mask = componentMasks.get(ctor);
    if (mask === undefined) {
      mask = 1 << nextComponentId++;
      componentMasks.set(ctor, mask);
    }
    return mask;
  }
}

// Concrete components
class Position extends Component {
  x = 0;
  y = 0;
  z = 0;
}

class Velocity extends Component {
  vx = 0;
  vy = 0;
  vz = 0;
}

class Health extends Component {
  value = 100;
}

class Name extends Component {
  name = "";
}

// Pre-register components to get consistent masks
const ComponentMask = {
  Position: Component.getMask(Position),
  Velocity: Component.getMask(Velocity),
  Health: Component.getMask(Health),
  Name: Component.getMask(Name),
};

interface Archetype {
  mask: number;
  count: number;
  entities: number[];
  // SoA storage - direct property access (faster than Map for stable shapes)
  [key: string]: unknown;
}

class World {
  private nextEntityId = 0;
  private archetypes: Archetype[] = [];
  private archetypesByMask = new Map<number, Archetype>();
  private entityLocations = new Map<
    number,
    { archetype: Archetype; row: number }
  >();
  private pendingComponents = new Map<
    number,
    Map<ComponentConstructor, Component>
  >();
  // Query cache - avoids allocations in hot path
  private queryCache = new Map<number, Archetype[]>();

  createEntity(): number {
    const id = this.nextEntityId++;
    this.pendingComponents.set(id, new Map());
    return id;
  }

  addComponent<T extends Component>(
    entityId: number,
    ctor: ComponentConstructor<T>,
    _data: Partial<T>
  ): void {
    const pending = this.pendingComponents.get(entityId);
    if (pending) {
      const instance = new ctor();
      pending.set(ctor, instance);
    } else {
      throw new Error("Component migration not yet implemented");
    }
  }

  finalizeEntity(entityId: number): void {
    const pending = this.pendingComponents.get(entityId);
    if (!pending) return;

    let mask = 0;
    pending.forEach((_, ctor) => {
      mask |= Component.getMask(ctor);
    });

    let archetype = this.archetypesByMask.get(mask);
    if (!archetype) {
      archetype = this.createArchetype(mask, pending);
      // Invalidate query cache when new archetype is created
      this.queryCache.clear();
    }

    const row = archetype.count++;
    archetype.entities[row] = entityId;

    // Copy component data to SoA columns (direct property access)
    pending.forEach((component) => {
      for (const [key, value] of Object.entries(component)) {
        if (key === COMPONENT_TYPE.toString()) continue;
        const column = archetype[key] as number[];
        if (column) {
          column[row] = value as number;
        }
      }
    });

    this.entityLocations.set(entityId, { archetype, row });
    this.pendingComponents.delete(entityId);
  }

  private createArchetype(
    mask: number,
    components: Map<ComponentConstructor, Component>,
    initialCapacity = 20_000
  ): Archetype {
    const archetype: Archetype = {
      mask,
      count: 0,
      entities: new Array(initialCapacity),
    };

    // Add column arrays as direct properties
    components.forEach((component) => {
      for (const key of Object.keys(component)) {
        if (key === COMPONENT_TYPE.toString()) continue;
        if (!(key in archetype)) {
          archetype[key] = new Array(initialCapacity);
        }
      }
    });

    this.archetypes.push(archetype);
    this.archetypesByMask.set(mask, archetype);
    return archetype;
  }

  // Cached query - no allocation on cache hit
  query(required: number): Archetype[] {
    const cached = this.queryCache.get(required);
    if (cached) return cached;

    const results: Archetype[] = [];
    for (let i = 0; i < this.archetypes.length; i++) {
      if ((this.archetypes[i].mask & required) === required) {
        results.push(this.archetypes[i]);
      }
    }
    this.queryCache.set(required, results);
    return results;
  }
}

// Create World
const world = new World();

// Create 20k entities with Position + Velocity + Name
for (let i = 0; i < 20_000; i++) {
  const id = world.createEntity();
  world.addComponent(id, Position, {
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    z: Math.random() * 1000,
  });
  world.addComponent(id, Velocity, {
    vx: Math.random() * 2 - 1,
    vy: Math.random() * 2 - 1,
    vz: Math.random() * 2 - 1,
  });
  world.addComponent(id, Name, { name: `Entity_${id}` });
  world.finalizeEntity(id);
}

// Create 20k entities with Position + Velocity + Health
for (let i = 0; i < 20_000; i++) {
  const id = world.createEntity();
  world.addComponent(id, Position, {
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    z: Math.random() * 1000,
  });
  world.addComponent(id, Velocity, {
    vx: Math.random() * 2 - 1,
    vy: Math.random() * 2 - 1,
    vz: Math.random() * 2 - 1,
  });
  world.addComponent(id, Health, { value: 100 });
  world.finalizeEntity(id);
}

{
  const times: number[] = [];
  for (let iter = 0; iter < 1000; iter++) {
    const start = performance.now();

    // Query and cache columns INSIDE the loop (realistic per-frame cost)
    const posVelArchetypes = world.query(
      ComponentMask.Position | ComponentMask.Velocity
    );

    // System: update positions
    for (let a = 0; a < posVelArchetypes.length; a++) {
      const arch = posVelArchetypes[a];
      const x = arch["x"] as number[];
      const y = arch["y"] as number[];
      const z = arch["z"] as number[];
      const vx = arch["vx"] as number[];
      const vy = arch["vy"] as number[];
      const vz = arch["vz"] as number[];
      const len = arch.count;
      for (let i = 0; i < len; i++) {
        x[i] += vx[i];
        y[i] += vy[i];
        z[i] += vz[i];
      }
    }

    // Query health archetypes
    const healthArchetypes = world.query(ComponentMask.Health);

    // System: damage over time
    for (let a = 0; a < healthArchetypes.length; a++) {
      const arch = healthArchetypes[a];
      const health = arch["value"] as number[];
      const len = arch.count;
      for (let i = 0; i < len; i++) {
        health[i] -= 0.1;
      }
    }

    times.push(performance.now() - start);
  }
  const trimmed = times.slice(10);
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  console.log("Archetype (per-frame query) mean avg:", mean);
}
//
// // ============ Packed Iteration (5 queries) Benchmark ============
// // Dataset: 1,000 entities, each with (A, B, C, D, E) components
// // Test: 5 queries, each doubling the component's value
//
// class A extends Component {
//   a = 1;
// }
// class B extends Component {
//   b = 1;
// }
// class C extends Component {
//   c = 1;
// }
// class D extends Component {
//   d = 1;
// }
// class E extends Component {
//   e = 1;
// }
//
// const MaskA = Component.getMask(A);
// const MaskB = Component.getMask(B);
// const MaskC = Component.getMask(C);
// const MaskD = Component.getMask(D);
// const MaskE = Component.getMask(E);
//
// const PACKED_5_COUNT = 1_000;
//
// // function setupPacked5() {
// //   const w = new World();
// //
// //   for (let i = 0; i < PACKED_5_COUNT; i++) {
// //     const id = w.createEntity();
// //     w.addComponent(id, A, { a: 1 });
// //     w.addComponent(id, B, { b: 1 });
// //     w.addComponent(id, C, { c: 1 });
// //     w.addComponent(id, D, { d: 1 });
// //     w.addComponent(id, E, { e: 1 });
// //     w.finalizeEntity(id);
// //   }
// //
// //   // Return the iteration function (5 separate queries)
// //   return () => {
// //     // Query A and double its value
// //     const archA = w.query(MaskA);
// //     for (let i = 0; i < archA.length; i++) {
// //       const arch = archA[i];
// //       const a = arch["a"] as number[];
// //       const len = arch.count;
// //       for (let j = 0; j < len; j++) {
// //         a[j] *= 2;
// //       }
// //     }
// //
// //     // Query B and double its value
// //     const archB = w.query(MaskB);
// //     for (let i = 0; i < archB.length; i++) {
// //       const arch = archB[i];
// //       const b = arch["b"] as number[];
// //       const len = arch.count;
// //       for (let j = 0; j < len; j++) {
// //         b[j] *= 2;
// //       }
// //     }
// //
// //     // Query C and double its value
// //     const archC = w.query(MaskC);
// //     for (let i = 0; i < archC.length; i++) {
// //       const arch = archC[i];
// //       const c = arch["c"] as number[];
// //       const len = arch.count;
// //       for (let j = 0; j < len; j++) {
// //         c[j] *= 2;
// //       }
// //     }
// //
// //     // Query D and double its value
// //     const archD = w.query(MaskD);
// //     for (let i = 0; i < archD.length; i++) {
// //       const arch = archD[i];
// //       const d = arch["d"] as number[];
// //       const len = arch.count;
// //       for (let j = 0; j < len; j++) {
// //         d[j] *= 2;
// //       }
// //     }
// //
// //     // Query E and double its value
// //     const archE = w.query(MaskE);
// //     for (let i = 0; i < archE.length; i++) {
// //       const arch = archE[i];
// //       const e = arch["e"] as number[];
// //       const len = arch.count;
// //       for (let j = 0; j < len; j++) {
// //         e[j] *= 2;
// //       }
// //     }
// //   };
// // }
// //
// // // Run benchmark using same methodology as the benchmark suite
// // function runBenchmark(setupFn: () => () => void): { hz: number; ms: number } {
// //   const fn = setupFn();
// //
// //   let cycle_n = 1;
// //   let cycle_ms = 0;
// //   let cycle_total_ms = 0;
// //
// //   // Run multiple cycles to get an estimate
// //   while (cycle_total_ms < 500) {
// //     const start = performance.now();
// //     for (let i = 0; i < cycle_n; i++) {
// //       fn();
// //     }
// //     const elapsed = performance.now() - start;
// //     cycle_ms = elapsed / cycle_n;
// //     cycle_n *= 2;
// //     cycle_total_ms += elapsed;
// //   }
// //
// //   // Try to estimate the iteration count for 500ms
// //   const target_n = 500 / cycle_ms;
// //   const start = performance.now();
// //   for (let i = 0; i < target_n; i++) {
// //     fn();
// //   }
// //   const total_ms = performance.now() - start;
// //
// //   return {
// //     hz: (target_n / total_ms) * 1_000, // ops/sec
// //     ms: total_ms / target_n, // ms/op
// //   };
// // }
// //
// // console.log("\n============ ECS Benchmark Suite: packed_5 ============");
// // const result = runBenchmark(setupPacked5);
// // console.log(`packed_5: ${Math.floor(result.hz).toLocaleString()} op/s`);
// // console.log(`          ${result.ms.toFixed(4)} ms/op`);
