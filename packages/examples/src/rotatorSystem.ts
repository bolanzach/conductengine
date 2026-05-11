import { Query, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Rotator } from "./rotator";

export default function RotatorSystem(query: Query<[Transform3D, Rotator]>) {
  query.iter(([_, transform, rotator]) => {
    transform.rx += rotator.rx * deltaTime;
    transform.ry += rotator.ry * deltaTime;
    transform.rz += rotator.rz * deltaTime;
  });
}