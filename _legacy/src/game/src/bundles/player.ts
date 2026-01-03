import { Bundle, Network, World } from "../../../conduct-ecs";
import EventComponent from "../../../conduct-ecs/components/eventComponent";
import Input from "../../../conduct-ecs/components/input";
import Transform2D from "../../../conduct-ecs/components/transformComponent";
import { Entity } from "../../../conduct-ecs/entity";

export default class PlayerBundle implements Bundle {
  build(player: Entity, w: World): Entity {
    // w.addComponentToEntity(player, Transform2D, {
    //   x: 0,
    //   y: 0,
    //   rx: 0,
    //   ry: 0,
    // })
    //   .addComponentToEntity(player, Network, {
    //     bundle: PlayerBundle.name,
    //   })
    //   .addComponentToEntity(player, Input, {})
    //   .addComponentToEntity(player, EventComponent, {});
    return player;
  }
}

const idk = [
  [Network, { bundle: PlayerBundle.name }],
  [Input, {}],
  [EventComponent, {}],
];
