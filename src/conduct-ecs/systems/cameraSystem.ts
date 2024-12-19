import { Query } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";

export default function CameraSystem(
  query: Query<[CameraComponent, Transform3DComponent]>
) {
  //query.iter(([_, camera, transform]) => {});
}
