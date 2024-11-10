import { WebGpuRendererState } from "@/client/webGpuRendererInitSystem";
import { Query, World } from "@/conduct-ecs";

export default function WebGpuRendererSystem(query: Query<[]>) {
  const { context } = query.world.getState(WebGpuRendererState);
}
