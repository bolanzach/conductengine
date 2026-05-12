import { ConductDeleteEntity, Query, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Bullet } from "./bullet";

export default function BulletMovementSystem(query: Query<[Transform3D, Bullet]>) {
  query.iter(([entity, transform, bullet]) => {
    transform.x += bullet.dx * bullet.speed * deltaTime;
    transform.z += bullet.dz * bullet.speed * deltaTime;

    bullet.lifetime -= deltaTime;
    if (bullet.lifetime <= 0) {
      ConductDeleteEntity(entity);
    }
  });
}