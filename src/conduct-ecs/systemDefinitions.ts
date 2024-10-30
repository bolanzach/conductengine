import EventSystem from "@/conduct-ecs/systems/eventSystem";
import EventComponent, {
  EVENTS,
} from "@/conduct-ecs/components/eventComponent";
import MainGameStartSystem from "@/game/src/main";
import { ComponentType, SystemParams } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestSystem from "@/game/src/systems/testSystem";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";


export const EventSystemDefinition = {
            system: EventSystem,
            queryWith: [EventComponent] as ComponentType[]
          };
export const MainGameStartSystemDefinition = {
            system: MainGameStartSystem,
            queryWith: [] as ComponentType[]
          };
export const TestSystemDefinition = {
            system: TestSystem,
            queryWith: [TestComponent, TestComponent] as ComponentType[]
          };
export const TestTwoSystemDefinition = {
            system: TestTwoSystem,
            queryWith: [TestTwoComponent] as ComponentType[]
          };

