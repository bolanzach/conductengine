import { Query } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import { createState } from "@/conduct-ecs/state";

export const CameraState = createState<{
  mainCamera: {
    camera: CameraComponent;
    transform: Transform3DComponent;
  };
}>();

export default function CameraSystem(
  query: Query<[CameraComponent, Transform3DComponent]>
) {
  const [[_, camera, transform]] = query;

  query.world.registerState(CameraState, {
    mainCamera: {
      camera,
      transform,
    },
  });
}
