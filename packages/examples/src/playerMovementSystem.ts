import { Query } from "@conduct/ecs";
import { CURRENT_INPUTS, Transform2D } from "@conduct/simulation";
import { Player } from "./player.js";

export default function PlayerMovementSystem(query: Query<[Transform2D, Player]>) {
  console.log('player movement system running');

  query.iter(([_, transform]) => {
    if (CURRENT_INPUTS.has('ArrowLeft')) {
      transform.x -= 1;
    }
    if (CURRENT_INPUTS.has('ArrowRight')) {
      transform.x += 1;
    }
    if (CURRENT_INPUTS.has('ArrowUp')) {
      transform.y -= 1;
    }
    if (CURRENT_INPUTS.has('ArrowDown')) {
      transform.y += 1;
    }
  })
}
