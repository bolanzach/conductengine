const Benchmark = require("benchmark");
const suite = new Benchmark.Suite();

const entities = new Array(10_000).map((_, index) => index);
const archetypes = [
  {
    entities,
    components: new Map([
      ["one", entities],
      ["two", entities],
      ["three", entities],
      ["four", entities],
      ["five", entities],
      ["six", entities],
      ["seven", entities],
      ["eight", entities],
      ["nine", entities],
      ["ten", entities],
    ]),
    chunkSize: 10,
    vectorComponents: [
      ...entities,
      ...entities,
      ...entities,
      ...entities,
      ...entities,
      ...entities,
      ...entities,
      ...entities,
      ...entities,
      ...entities,
    ],
  },
  {
    entities,
    components: new Map([
      ["one", entities],
      ["two", entities],
      ["three", entities],
    ]),
    chunkSize: 3,
    vectorComponents: [entities, ...entities, ...entities],
  },
  {
    entities,
    components: new Map([
      ["one", entities],
      ["two", entities],
      ["three", entities],
      ["four", entities],
    ]),
    chunkSize: 4,
    vectorComponents: [entities, ...entities, ...entities, ...entities],
  },
  // {
  //   entities,
  //   components: new Map([
  //     ["eight", entities],
  //     ["nine", entities],
  //     ["ten", entities],
  //   ]),
  // },
];
const systems = [
  {
    with: ["three", "two", "one"],
  },
  {
    with: ["two", "one"],
  },
  {
    with: ["one"],
  },
];

const system = {
  update: (entity, a, b, c) => {
    const val = a.value + b.value;
    c.value = val + entity;
    if (entity > 5_000) {
      c.value++;
    }
  },
};

const componentAList = new Array(10_000).fill(0).map((_, i) => ({
  value: i,
}));

const componentBList = new Array(10_000).fill(0).map(() => ({
  value: 0,
}));

const componentCList = new Array(10_000).fill(0).map(() => ({
  value: 0,
}));

const componentUpdate = new Array(10_000).fill(0).map((_, i) => ({
  value: 0,
  refA: componentAList[i],
  refB: componentBList[i],

  update() {
    const val = this.refA.value + this.refB.value;
    this.value = val;
  },
}));

const NUMBER_OF_UPDATES = 1_000;

// const componentsMap = [];
//
// for (let i = 0; i < NUMBER_OF_UPDATES; i++) {
//   const components = new Array(10_000).fill(0).map((_, i) => ({
//     value: 0,
//     entity: i,
//     refA: componentAList[i],
//     refB: componentBList[i],
//
//     update() {
//       const val = this.refA.value + this.refB.value;
//       this.value = val + this.entity;
//       if (this.entity > 5_000) {
//         this.value++;
//       }
//     },
//   }));
//   componentsMap[i] = components;
// }

suite
  // .add("NO_MAPPING", () => {
  //   //
  //   for (let s = 0; s < systems.length; s++) {
  //     const system = systems[s];
  //     const systemWith = system.with;
  //
  //     for (let a = 0; a < archetypes.length; a++) {
  //       const archetype = archetypes[a];
  //       const archetypeComponents = archetype.components;
  //       const components = [];
  //
  //       for (let e = 0; e < archetype.entities.length; e++) {
  //         for (let j = 0; j < systemWith.length; j++) {
  //           const systemComponentType = systemWith[j];
  //           const systemComponents =
  //             archetypeComponents.get(systemComponentType);
  //           components.push(systemComponents[e]);
  //         }
  //       }
  //     }
  //   }
  // })
  // .add("WITH_MAPPING_VECTOR", () => {
  //   //
  //   for (let s = 0; s < systems.length; s++) {
  //     const system = systems[s];
  //     const systemWith = system.with;
  //     const systemParamsLookup = systemWith.reduce((acc, c, i) => {
  //       return { [i]: c, ...acc };
  //     }, {});
  //
  //     for (let a = 0; a < archetypes.length; a++) {
  //       const archetype = archetypes[a];
  //       const chunkSize = archetype.chunkSize;
  //       const vector = archetype.vectorComponents;
  //       const components = [];
  //
  //       for (let i = 0; i < vector.length; i++) {
  //         const c = vector[i]; // i + k
  //         if (!systemParamsLookup["asd"]) {
  //           components.push(c);
  //         }
  //       }
  //     }
  //   }
  // })
  // .add("ECS", () => {
  //   for (let i = 0; i < componentAList.length; i++) {
  //     system.update(componentAList[i], componentBList[i], componentCList[i]);
  //   }
  // })
  //
  // .add("BEHAVIOR", () => {
  //   for (let i = 0; i < componentUpdate.length; i++) {
  //     componentUpdate[i].update();
  //   }
  // })

  .add("ECS (2)", () => {
    for (let i = 0; i < NUMBER_OF_UPDATES; i++) {
      for (let ii = 0; ii < componentAList.length; ii++) {
        if (ii < 1000) {
          continue;
        }
        system.update(
          ii,
          componentAList[ii],
          componentBList[ii],
          componentCList[ii]
        );
      }
    }
  })

  // .add("BEHAVIOR (2)", () => {
  //   for (let i = 0; i < componentsMap.length; i++) {
  //     for (let ii = 0; ii < componentsMap[i].length; ii++) {
  //       componentsMap[i][ii].update();
  //     }
  //   }
  // })

  ////// Run the suite
  .on("cycle", (event) => {
    const benchmark = event.target;

    console.log(benchmark.toString());
  })
  .on("complete", (event) => {
    const suite = event.currentTarget;
    const fastestOption = suite.filter("fastest").map("name");

    console.log(`The fastest option is ${fastestOption}`);
  })
  .run();
