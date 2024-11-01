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

  const e = world.addEntity();
  world.addComponentToEntity(e, TestComponent, {
    value: 0,
  });

  world
    .registerSystem(TestSystem)
    .registerSystem(TestTwoSystem)
    .registerSystem(TestThreeSystem);

  for (let i = 0; i < 10_000; i++) {
    const ee = world.addEntity();
    world.addComponentToEntity(ee, TestComponent, {
      value: 0,
    });
    world.addComponentToEntity(ee, TestTwoComponent, {
      value: i,
      name: "test",
    });
    world.addComponentToEntity(ee, EventComponent, {});
  }

  // world.registerBundle(new PlayerBundle());

  world.start();

  setInterval(() => {
    for (let i = 0; i < 2500; i++) {
      const ee = world.addEntity();
      world.addComponentToEntity(ee, TestComponent, {
        value: 0,
      });
      world.addComponentToEntity(ee, TestTwoComponent, {
        value: i,
        name: "test",
      });
      world.addComponentToEntity(ee, EventComponent, {});
    }
  }, 1000);
}
