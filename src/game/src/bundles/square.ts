import { loadClientModule } from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import type * as SquareClientModule from "@/game/src/bundles/square.client";

export default async function squareBundle(world: World) {
  const mod = await loadClientModule<typeof SquareClientModule>(
    "src/bundles/square.client.ts"
  );

  world
    .addEntity()
    .add(Transform3DComponent, {})
    .add(RenderComponent, mod?.initSquareClientRenderer(world) || {});
}
