import { Query, deltaTime } from "@conduct/ecs";
import { Inputs, Transform3D } from "@conduct/simulation";
import { PlayerTag } from "./playerTag";

const MOVE_SPEED = 6;

export default function PlayerMovementSystem(query: Query<[Transform3D, PlayerTag]>) {
  query.iter(([_, transform]) => {
    let xVelocity = 0;
    let zVelocity = 0;
    if (Inputs.isKeyPressed('ArrowLeft')) {
      xVelocity -= MOVE_SPEED;
    }
    if (Inputs.isKeyPressed('ArrowRight')) {
      xVelocity += MOVE_SPEED;
    }
    if (Inputs.isKeyPressed('ArrowUp')) {
      zVelocity -= MOVE_SPEED;
    }
    if (Inputs.isKeyPressed('ArrowDown')) {
      zVelocity += MOVE_SPEED;
    }

    transform.x += xVelocity * deltaTime;
    transform.z += zVelocity * deltaTime;
  })
}
