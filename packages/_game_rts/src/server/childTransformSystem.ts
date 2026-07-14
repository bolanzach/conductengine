import type { Query } from "@conduct/ecs";
import { ChildOf } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";

// Local offset for gun relative to parent marine
const GUN_OFFSET_X = 0.1;
const GUN_OFFSET_Y = 0.25;
const GUN_OFFSET_Z = 0.15;

export default function ChildTransformSystem(
  childQuery: Query<[Transform3D, ChildOf]>,
  parentQuery: Query<[Transform3D]>,
) {
  childQuery.iter(([_, transform, childOf]) => {
    parentQuery.get(childOf.parent, ([parentTransform]) => {
      const ry = parentTransform.ry;
      const cos = Math.cos(ry);
      const sin = Math.sin(ry);

      // Rotate local offset by parent's facing direction
      transform.x = parentTransform.x + cos * GUN_OFFSET_X - sin * GUN_OFFSET_Z;
      transform.y = parentTransform.y + GUN_OFFSET_Y;
      transform.z = parentTransform.z + sin * GUN_OFFSET_X + cos * GUN_OFFSET_Z;
      transform.ry = ry;
    });
  });
}