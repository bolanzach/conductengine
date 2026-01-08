import { Query } from "@conduct/ecs";
import { Inputs, Transform2D } from "@conduct/simulation";
import { Player } from "./player.js";

export default function PlayerMovementSystem(query: Query<[Transform2D, Player]>) {
  query.iter(([_, transform]) => {
    let xVelocity = 0;
    let yVelocity = 0;
    if (Inputs.isKeyPressed('ArrowLeft')) {
      xVelocity -= 1;
    }
    if (Inputs.isKeyPressed('ArrowRight')) {
      xVelocity += 1;
    }
    if (Inputs.isKeyPressed('ArrowUp')) {
      yVelocity -= 1;
    }
    if (Inputs.isKeyPressed('ArrowDown')) {
      yVelocity += 1;
    }

    transform.x += xVelocity;
    transform.y += yVelocity;
  })
}
