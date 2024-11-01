import "reflect-metadata";

import { World } from "@/conduct-ecs";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestSystem from "@/game/src/systems/testSystem";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";

export default function MainGameStartInitSystem(world: World) {
  console.log("GAME INIT");

  const e = world.createEntity();
  world.addComponentToEntity(e, TestComponent, {
    value: 0,
  });

  world.registerSystem(TestSystem).registerSystem(TestTwoSystem);

  for (let i = 0; i < 10_000; i++) {
    const ee = world.createEntity();
    world.addComponentToEntity(ee, TestComponent, {
      value: 0,
    });
    const eee = world.createEntity();
    world.addComponentToEntity(eee, TestTwoComponent, { value: i });
    world.addComponentToEntity(eee, EventComponent, {});
  }

  // world.registerBundle(new PlayerBundle());

  world.start();

  setTimeout(() => {
    for (let i = 0; i < 10000; i++) {
      const ee = world.createEntity();
      world.addComponentToEntity(ee, TestComponent, {
        value: 0,
      });
      world.addComponentToEntity(ee, TestTwoComponent, { value: i });
    }
  }, 1000);
}
