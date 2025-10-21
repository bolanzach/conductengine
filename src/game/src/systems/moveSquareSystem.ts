import { Query } from "@/conduct-ecs";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import MoveSquareComponent from "@/game/src/components/moveSquare";

export default function MoveSquareSystem(
  query: Query<[Transform3DComponent, MoveSquareComponent]>
) {
  query.iter(([_, transform]) => {
    const now = Date.now() / 1000;
    transform.rx = Math.cos(now);
  });
}
