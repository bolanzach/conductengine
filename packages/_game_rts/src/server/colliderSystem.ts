import type { Query } from "@conduct/ecs";
import { ConductEventEmit } from "@conduct/events";
import { Transform3D } from "@conduct/simulation";
import { BoundingBox } from "../shared/boundingBox.js";
import { CollisionEvent } from "../shared/collisionEvent.js";
import { collisionService } from "./collision.js";

export default function ColliderSystem(query: Query<[Transform3D, BoundingBox]>): void {
  query.iter(([entity, t, b]) => {
    collisionService.update(entity, t.x, t.y, t.z, b.hx, b.hy, b.hz);
  });

  const pairs = collisionService.detectAll();

  for (let i = 0; i < pairs.length; i++) {
    const event = new CollisionEvent(pairs[i]![0]!, pairs[i]![1]!);
    ConductEventEmit(event);
  }
}
