import 'reflect-metadata';

import { Component, Query, System, SystemParams, World } from '../../conduct-ecs';
import { WorldConfig } from '../../conduct-ecs/world';

////// MOVE THIS
interface GameInstanceConfig extends WorldConfig {
  gameHost: "client" | "server",
  setup: (w: World) => void,
}

class TestComponent extends Component {
  name = 'Test-Component';
}

class TestSystem implements System {
  @Query()
  Update(params: SystemParams, td: TestComponent) {
    console.log('System Update', td.name, params.time.delta);
  }
}


export default function main(config: GameInstanceConfig): void {
  console.log("game init >", config.gameHost);

  const w = new World(config).RegisterSystem(new TestSystem());

  const entity = w.CreateEntity();
  w.AddEntityComponent(entity, new TestComponent());

  w.start()
  console.log("game started!")
}

// "devDependencies": {
//   "@eslint/js": "^9.12.0",
//     "@swc/cli": "^0.4.1-nightly.20240914",
//     "@swc/core": "^1.7.26",
//     "@types/express": "^5.0.0",
//     "@types/lodash": "^4.17.10",
//     "@types/raf": "^3.4.3",
//     "eslint": "^9.12.0",
//     "globals": "^15.10.0",
//     "prettier": "3.1.1",
//     "ts-loader": "^9.5.1",
//     "typescript": "^5.3.3",
//     "typescript-eslint": "^8.8.0",
//     "webpack": "^5.95.0",
//     "webpack-cli": "^5.1.4"
// }