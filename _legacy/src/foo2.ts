// ============ Baseline Performance ============
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
  console.log("Baseline mean:", mean);
}

// ============ Minimal Archetype System ============

// Component storage per archetype - SoA within each archetype
interface Archetype {
  components: Map<string, number[]>;
  count: number;
}

// Archetype for position + velocity entities
const posVelArchetype: Archetype = {
  components: new Map([
    ["x", new Array(COUNT_1)],
    ["y", new Array(COUNT_1)],
    ["z", new Array(COUNT_1)],
    ["vx", new Array(COUNT_1)],
    ["vy", new Array(COUNT_1)],
    ["vz", new Array(COUNT_1)],
  ]),
  count: COUNT_1,
};

// Archetype for value-only entities
const valueArchetype: Archetype = {
  components: new Map([["value", new Array(COUNT2)]]),
  count: COUNT2,
};

// Initialize archetype data
{
  const x = posVelArchetype.components.get("x")!;
  const y = posVelArchetype.components.get("y")!;
  const z = posVelArchetype.components.get("z")!;
  const vx = posVelArchetype.components.get("vx")!;
  const vy = posVelArchetype.components.get("vy")!;
  const vz = posVelArchetype.components.get("vz")!;
  for (let i = 0; i < COUNT_1; i++) {
    x[i] = Math.random() * 1000;
    y[i] = Math.random() * 1000;
    z[i] = Math.random() * 1000;
    vx[i] = Math.random() * 2 - 1;
    vy[i] = Math.random() * 2 - 1;
    vz[i] = Math.random() * 2 - 1;
  }
  const value = valueArchetype.components.get("value")!;
  for (let i = 0; i < COUNT2; i++) {
    value[i] = Math.random() * 1000;
  }
}

// Benchmark archetype system
{
  const times: number[] = [];
  for (let iter = 0; iter < 1000; iter++) {
    const start = performance.now();

    // Fetch arrays each frame (realistic game loop)
    const x = posVelArchetype.components.get("x")!;
    const y = posVelArchetype.components.get("y")!;
    const z = posVelArchetype.components.get("z")!;
    const vx = posVelArchetype.components.get("vx")!;
    const vy = posVelArchetype.components.get("vy")!;
    const vz = posVelArchetype.components.get("vz")!;
    const count1 = posVelArchetype.count;

    // Update positions
    for (let i = 0; i < count1; i++) {
      x[i] += vx[i];
      y[i] += vy[i];
      z[i] += vz[i];
    }

    // Fetch value archetype arrays
    const value = valueArchetype.components.get("value")!;
    const count2 = valueArchetype.count;

    // Update values
    for (let i = 0; i < count2; i++) {
      value[i] += vx[i];
    }

    times.push(performance.now() - start);
  }
  const trimmed = times.slice(10);
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  console.log("Archetype mean:", mean);
}

// ============ Bitmask Query System ============

// Component bits
const C_X = 1 << 0;
const C_Y = 1 << 1;
const C_Z = 1 << 2;
const C_VX = 1 << 3;
const C_VY = 1 << 4;
const C_VZ = 1 << 5;
const C_VALUE = 1 << 6;

// Archetype with bitmask
interface ArchetypeB {
  mask: number;
  components: Map<number, number[]>; // keyed by component bit
  count: number;
}

// Query definition
interface Query {
  required: number; // bitmask of required components
}

// World holds all archetypes
const archetypes: ArchetypeB[] = [];

// Position + Velocity archetype
const posVelArchetypeB: ArchetypeB = {
  mask: C_X | C_Y | C_Z | C_VX | C_VY | C_VZ,
  components: new Map([
    [C_X, new Array(COUNT_1)],
    [C_Y, new Array(COUNT_1)],
    [C_Z, new Array(COUNT_1)],
    [C_VX, new Array(COUNT_1)],
    [C_VY, new Array(COUNT_1)],
    [C_VZ, new Array(COUNT_1)],
  ]),
  count: COUNT_1,
};
archetypes.push(posVelArchetypeB);

// Value-only archetype
const valueArchetypeB: ArchetypeB = {
  mask: C_VALUE,
  components: new Map([[C_VALUE, new Array(COUNT2)]]),
  count: COUNT2,
};
archetypes.push(valueArchetypeB);

// Initialize bitmask archetype data
{
  const x = posVelArchetypeB.components.get(C_X)!;
  const y = posVelArchetypeB.components.get(C_Y)!;
  const z = posVelArchetypeB.components.get(C_Z)!;
  const vx = posVelArchetypeB.components.get(C_VX)!;
  const vy = posVelArchetypeB.components.get(C_VY)!;
  const vz = posVelArchetypeB.components.get(C_VZ)!;
  for (let i = 0; i < COUNT_1; i++) {
    x[i] = Math.random() * 1000;
    y[i] = Math.random() * 1000;
    z[i] = Math.random() * 1000;
    vx[i] = Math.random() * 2 - 1;
    vy[i] = Math.random() * 2 - 1;
    vz[i] = Math.random() * 2 - 1;
  }
  const value = valueArchetypeB.components.get(C_VALUE)!;
  for (let i = 0; i < COUNT2; i++) {
    value[i] = Math.random() * 1000;
  }
}

// Query definitions
const posVelQuery: Query = { required: C_X | C_Y | C_Z | C_VX | C_VY | C_VZ };
const valueQuery: Query = { required: C_VALUE | C_VX }; // needs VX from another archetype - won't match valueArchetypeB

// For fair comparison, value query just needs VALUE
const valueOnlyQuery: Query = { required: C_VALUE };

// Benchmark bitmask query system
{
  const times: number[] = [];
  for (let iter = 0; iter < 1000; iter++) {
    const start = performance.now();

    // Execute position+velocity query
    for (const arch of archetypes) {
      if ((arch.mask & posVelQuery.required) === posVelQuery.required) {
        const x = arch.components.get(C_X)!;
        const y = arch.components.get(C_Y)!;
        const z = arch.components.get(C_Z)!;
        const vx = arch.components.get(C_VX)!;
        const vy = arch.components.get(C_VY)!;
        const vz = arch.components.get(C_VZ)!;
        const count = arch.count;

        for (let i = 0; i < count; i++) {
          x[i] += vx[i];
          y[i] += vy[i];
          z[i] += vz[i];
        }
      }
    }

    // Execute value query (needs vx from posVel archetype for fair comparison)
    const vxArr = posVelArchetypeB.components.get(C_VX)!;
    for (const arch of archetypes) {
      if ((arch.mask & valueOnlyQuery.required) === valueOnlyQuery.required) {
        const value = arch.components.get(C_VALUE)!;
        const count = arch.count;

        for (let i = 0; i < count; i++) {
          value[i] += vxArr[i];
        }
      }
    }

    times.push(performance.now() - start);
  }
  const trimmed = times.slice(10);
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  console.log("Bitmask Query mean:", mean);
}
