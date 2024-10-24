import "reflect-metadata";

import { ComponentType, SystemParams } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestSystem from "@/game/src/systems/testSystem";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";

export default function MainGameStartSystem({ world }: SystemParams) {
  console.log("GAME INIT");

  const e = world.createEntity();
  world.addComponentToEntity(e, TestComponent, {
    value: 0,
  });

  world.registerSystem(TestSystem).registerSystem(TestTwoSystem);

  // for (let i = 0; i < 1000; i++) {
  //   const ee = world.createEntity();
  //   world.addComponentToEntity(ee, TestComponent, {
  //     value: 0,
  //   });
  //   world.addComponentToEntity(ee, TestTwoComponent, { value: i });
  // }

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
