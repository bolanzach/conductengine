import { Query } from "@conduct/ecs";
import { Inputs, Transform3D } from "@conduct/simulation";
import { PlayerTag } from "./playerTag";

export default function PlayerMovementSystem(query: Query<[Transform3D, PlayerTag]>) {
  query.iter(([_, transform]) => {
    let xVelocity = 0;
    let yVelocity = 0;
    if (Inputs.isKeyPressed('ArrowLeft')) {
      xVelocity -= 0.1;
    }
    if (Inputs.isKeyPressed('ArrowRight')) {
      xVelocity += 0.1;
    }
    if (Inputs.isKeyPressed('ArrowUp')) {
      yVelocity += 0.1;
    }
    if (Inputs.isKeyPressed('ArrowDown')) {
      yVelocity -= 0.1;
    }

    transform.x += xVelocity;
    transform.y += yVelocity;
  })
}
