import { Bundle, Network, World } from '../../../conduct-ecs';
import Transform2D from '../../../conduct-ecs/components/transform';
import { Entity } from '../../../conduct-ecs/entity';

export default class PlayerBundle implements Bundle {
  build(player: Entity, w: World): Entity {
    w.addComponentToEntity(player, Transform2D, {
      position: { x: 0, y: 0 },
      rotation: { x: 0, y: 0 },
    }).addComponentToEntity(player, Network, {
      bundle: PlayerBundle.name,
    });

    return player;
  }
}
