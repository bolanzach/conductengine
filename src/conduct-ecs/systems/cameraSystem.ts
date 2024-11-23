import { Query } from "@/conduct-ecs";
import CameraComponent, {
  getCameraViewProjectionMatrix,
} from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";

export default function CameraSystem(
  query: Query<[CameraComponent, Transform3DComponent]>
) {
  for (const [entity, camera, transform] of query) {
    console.log(entity);
  }
}
