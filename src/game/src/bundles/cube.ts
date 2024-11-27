import { loadClientModule } from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import type * as SquareClientModule from "@/game/src/bundles/cube.client";

export default async function cubeBundle(world: World) {
  const mod = await loadClientModule<typeof SquareClientModule>(
    "src/bundles/cube.client.ts"
  );

  world
    .addEntity()
    .add(Transform3DComponent, {})
    .add(RenderComponent, mod?.initCubeClientRenderer(world) || {});
}
