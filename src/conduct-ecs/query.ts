// import { Archetype } from "@/conduct-ecs/archetype";
// import { Component, ComponentType } from "@/conduct-ecs/component";
// import { Entity } from "@/conduct-ecs/entity";
// import { Signature, signatureContains } from "@/conduct-ecs/signature";
// import { World } from "@/conduct-ecs/world";
//
// const ZACH = new Array(2_000).fill([1]);
//
// /**
//  * Declare the Component types that a System should query for and operate on.
//  * When iterating over a Query, the first element is always the Entity, followed
//  * by the declared Components. A Query contains additional properties for
//  * accessing global variables, such as the World.
//  */
// export class Query<T extends Component[]> {
//   public archetypes: Archetype[] = [];
//   public world: World = undefined as unknown as World;
//
//   constructor(
//     private signature: Signature = [],
//     private componentTypes: ComponentType[] = []
//   ) {}
//
//   components(iter: (foo: [Entity, ...T]) => void) {
//     for (let a = 0; a < this.archetypes.length; a++) {
//       const systemQueryParams = [];
//       const archetype = this.archetypes[a];
//
//       if (!signatureContains(this.signature, archetype.signature)) {
//         // Signature does not match, skip this archetype
//         continue;
//       }
//
//       const archetypeComponents = archetype.components;
//
//       for (let i = 0; i < this.componentTypes.length; i++) {
//         const components = archetypeComponents.get(
//           this.componentTypes[i]
//         ) as Component[];
//         systemQueryParams[i] = components;
//       }
//
//       const params = []; //
//       const archetypeEntities = archetype.entities;
//       const length = this.componentTypes.length;
//       for (let e = 0, eCount = archetypeEntities.length; e < eCount; e++) {
//         params[0] = archetypeEntities[e];
//         for (let p = 0; p < length; p++) {
//           params[p + 1] = systemQueryParams[p][e];
//         }
//         // @ts-expect-error this is fine.
//         iter(params);
//       }
//     }
//   }
// }

import { Archetype } from "@/conduct-ecs/archetype";
import { Component, ComponentType } from "@/conduct-ecs/component";
import { Entity } from "@/conduct-ecs/entity";
import { Signature, signatureContains } from "@/conduct-ecs/signature";
import { World } from "@/conduct-ecs/world";

/**
 * Declare the Component types that a System should query for and operate on.
 * When iterating over a Query, the first element is always the Entity, followed
 * by the declared Components. A Query contains additional properties for
 * accessing global variables, such as the World.
 */
export class Query<T extends Component[]> {
  private _world: World = undefined as unknown as World;
  private records: [Entity[], Component[][]][] = [] as unknown as [
    Entity[],
    Component[][],
  ][];

  constructor(
    private signature: Signature = [],
    private componentTypes: ComponentType[] = []
  ) {}

  get world() {
    return this._world;
  }

  set world(world: World) {
    this._world = world;
  }

  handleNewArchetype(archetype: Archetype) {
    if (!signatureContains(this.signature, archetype.signature)) {
      // Signature does not match, skip this archetype
      return;
    }

    const components: Component[][] = [];
    for (let i = 0; i < this.componentTypes.length; i++) {
      components[i] = archetype.components.get(
        this.componentTypes[i]
      ) as Component[];
    }
    this.records.push([archetype.entities, components]);
  }

  components(iter: (foo: [Entity, ...T]) => void) {
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const params = []; //
      const length = this.componentTypes.length;
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        for (let p = 0; p < length; p++) {
          params[p + 1] = components[p][e];
        }
        // @ts-expect-error this is fine.
        iter(params);
      }
    }
  }
}
