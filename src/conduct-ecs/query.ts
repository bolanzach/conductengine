// import { Archetype } from "@/conduct-ecs/archetype";
// import { Component, ComponentType } from "@/conduct-ecs/component";
// import { Entity } from "@/conduct-ecs/entity";
// import { Signature, signatureContains } from "@/conduct-ecs/signature";
// import { World } from "@/conduct-ecs/world";
//
// /**
//  * Declare the Component types that a System should query for and operate on.
//  * When iterating over a Query, the first element is always the Entity, followed
//  * by the declared Components. A Query contains additional properties for
//  * accessing global variables, such as the World.
//  */
// export class Query<T extends Component[]> {
//   private systemQueryParams: [Entity, ...T][] = [];
//   public archetypes: Archetype[] = [];
//
//   public world: World = undefined as unknown as World;
//
//   constructor(
//     private signature: Signature = [],
//     private componentTypes: ComponentType[] = []
//   ) {}
//
//   get components(): readonly [Entity, ...T][] {
//     const systemQueryParams: [Entity, ...T][] = [];
//
//     for (let a = 0; a < this.archetypes.length; a++) {
//       const archetype = this.archetypes[a];
//
//       if (!signatureContains(this.signature, archetype.signature)) {
//         // Signature does not match, skip this archetype
//         continue;
//       }
//
//       const startingIndex = systemQueryParams.length;
//       const archetypeComponents = archetype.components;
//       const archetypeEntities = archetype.entities;
//
//       for (let e = 0; e < archetypeEntities.length; e++) {
//         // @ts-expect-error this is fine
//         systemQueryParams.push([archetypeEntities[e]]);
//       }
//
//       for (let i = 0; i < this.componentTypes.length; i++) {
//         let idx = startingIndex;
//         const systemComponentType = this.componentTypes[i];
//         const components = archetypeComponents.get(
//           systemComponentType
//         ) as Component[];
//
//         for (let c = 0; c < components.length; c++) {
//           systemQueryParams[idx].push(components[c]);
//           idx++;
//         }
//       }
//     }
//
//     return systemQueryParams;
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
  public archetypes: Archetype[] = [];
  public world: World = undefined as unknown as World;

  constructor(
    private signature: Signature = [],
    private componentTypes: ComponentType[] = []
  ) {}

  get components(): readonly [Entity, ...T][] {
    const systemQueryParams: [Entity, ...T][] = [];

    for (let a = 0; a < this.archetypes.length; a++) {
      const archetype = this.archetypes[a];

      if (!signatureContains(this.signature, archetype.signature)) {
        // Signature does not match, skip this archetype
        continue;
      }

      const startingIndex = systemQueryParams.length;
      const archetypeComponents = archetype.components;
      const archetypeEntities = archetype.entities;

      for (let i = 0; i < this.componentTypes.length; i++) {
        let idx = startingIndex;
        const systemComponentType = this.componentTypes[i];
        const components = archetypeComponents.get(
          systemComponentType
        ) as Component[];

        for (let c = 0; c < components.length; c++) {
          if (systemQueryParams[idx] === undefined) {
            // @ts-expect-error this is fine
            systemQueryParams[idx] = [archetypeEntities[c]];
          }
          systemQueryParams[idx].push(components[c]);
          idx++;
        }
      }
    }

    return systemQueryParams;
  }
}
