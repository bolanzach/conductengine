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
  public world: World = undefined as unknown as World;

  /**
   * Cache references to archetype entities and components that match the Query.
   */
  private records: [Entity[], Component[][]][] = [] as unknown as [
    Entity[],
    Component[][],
  ][];

  constructor(
    private signature: Signature = [],
    private componentTypes: ComponentType[] = []
  ) {}

  handleNewArchetype(archetype: Archetype) {
    if (!signatureContains(this.signature, archetype.signature)) {
      // Signature does not match, skip this archetype
      return;
    }

    const components: Component[][] = [];
    for (let i = 0; i < this.componentTypes.length; i++) {
      const componentIndex = archetype.componentIndex.get(
        this.componentTypes[i]
      );
      if (componentIndex === undefined) {
        console.error(
          `Component not found in archetype: ${this.componentTypes[i]}`
        );
        return;
      }
      components[i] = archetype.components[componentIndex];
    }
    this.records.push([archetype.entities, components]);
  }

  /**
   * Invoke the `iteree` callback function for each Entity that matches the
   * Query. The callback is passed the Entity and the requested Components.
   * @param iteree
   */
  iter(iteree: (foo: [Entity, ...T]) => void) {
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const params = [];
      const length = this.componentTypes.length;
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        for (let p = 0; p < length; p++) {
          params[p + 1] = components[p][e];
        }
        // @ts-expect-error this is fine.
        iteree(params);
      }
    }
  }
}
