import "reflect-metadata";

import { World } from "@/conduct-ecs";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestSystem from "@/game/src/systems/testSystem";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";

export default function MainGameStartInitSystem(world: World) {
  console.log("GAME INIT");

  world
    .registerSystem(TestSystem)
    .registerSystem(TestTwoSystem)
    .registerSystem(TestThreeSystem);

  for (let i = 0; i < 10_000; i++) {
    world
      .addEntity()
      .add(TestComponent, { value: 0 })
      .add(TestTwoComponent, { value: i, name: "test" })
      .add(EventComponent, {});
  }

  // world.registerBundle(new PlayerBundle());

  world.start();

  setInterval(() => {
    for (let i = 0; i < 800; i++) {
      world
        .addEntity()
        .add(TestComponent, { value: 0 })
        .add(TestTwoComponent, { value: i, name: "test" })
        .add(EventComponent, {});
    }
  }, 1000);
}
