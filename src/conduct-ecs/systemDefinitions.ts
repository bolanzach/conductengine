import EventSystem from "@/conduct-ecs/systems/eventSystem";
import EventComponent, {
  EVENTS,
} from "@/conduct-ecs/components/eventComponent";
import TestSystem from "@/game/src/systems/testSystem";
import { Component, ComponentType } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";


export const EventSystemDefinition = {
            system: EventSystem,
            queryWith: [EventComponent] as ComponentType[]
          };
export const TestSystemDefinition = {
            system: TestSystem,
            queryWith: [TestComponent, TestTwoComponent] as ComponentType[]
          };
export const TestTwoSystemDefinition = {
            system: TestTwoSystem,
            queryWith: [TestTwoComponent] as ComponentType[]
          };

