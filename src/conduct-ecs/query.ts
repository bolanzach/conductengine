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
  private systemQueryParams: [Entity, ...T][] = [];

  constructor(
    public world: World,
    private signature: Signature,
    private componentTypes: ComponentType[],
    private archetypes: Archetype[]
  ) {
    this.createSystemQueryParams();
  }

  private createSystemQueryParams() {
    for (let a = 0; a < this.archetypes.length; a++) {
      const archetype = this.archetypes[a];

      if (!signatureContains(this.signature, archetype.signature)) {
        // Signature does not match, skip this archetype
        continue;
      }

      const archetypeComponents = archetype.components;
      const archetypeEntities = archetype.entities;

      // Collect the component columns based on the system's requirements
      const componentColumns: Component[][] = [];
      for (let i = 0; i < this.componentTypes.length; i++) {
        const systemComponentType = this.componentTypes[i];
        const components = archetypeComponents.get(
          systemComponentType
        ) as Component[];
        componentColumns.push(components);
      }

      for (let e = 0; e < archetypeEntities.length; e++) {
        // @ts-expect-error this is fine
        this.systemQueryParams.push([e]);
        for (let c = 0; c < componentColumns.length; c++) {
          this.systemQueryParams[e].push(componentColumns[c][e]);
        }
      }
    }
  }

  *[Symbol.iterator](): Generator<[Entity, ...T]> {
    for (let i = 0; i < this.systemQueryParams.length; i++) {
      yield this.systemQueryParams[i];
    }
  }
}
