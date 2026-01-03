import { loadClientModule } from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import type * as SquareClientModule from "@/game/src/bundles/cube.client";
import MoveSquareComponent from "@/game/src/components/moveSquare";

export default async function cubeBundle(world: World) {
  const mod = await loadClientModule<typeof SquareClientModule>(
    "src/bundles/cube.client.ts"
  );

  world
    .addEntity()
    .add(Transform3DComponent, {
      x: -4,
      y: 4,
    })
    .add(MoveSquareComponent, {})
    .add(RenderComponent, mod?.initCubeClientRenderer(world) || {});
}
