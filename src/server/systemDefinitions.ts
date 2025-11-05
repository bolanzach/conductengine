import CameraSystem from "@/conduct-ecs/systems/cameraSystem";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import InputSystem from "@/conduct-ecs/systems/client/inputSystem";
import EventSystem from "@/conduct-ecs/systems/eventSystem";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import MoveSquareSystem from "@/game/src/systems/moveSquareSystem";
import MoveSquareComponent from "@/game/src/components/moveSquare";
import PerformanceTestOneSystem from "@/game/src/systems/performanceTestOneSystem";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";
import PerformanceTestOneTwoSystem from "@/game/src/systems/performanceTestOneTwoSystem";
import PerformanceTestTwoComponent from "@/game/src/components/performanceTestTwoComponent";
import PerformanceTestThreeSystem from "@/game/src/systems/performanceTestThreeSystem";
import PerformanceTestThreeComponent from "@/game/src/components/performanceTestThreeComponent";
import PerformanceTestTwoSystem from "@/game/src/systems/performanceTestTwoSystem";
import TestSystem from "@/game/src/systems/testSystem";
import { ComponentType } from "@/conduct-ecs";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";


export const CameraSystemDefinition = {
            system: CameraSystem,
            queryWith: [[CameraComponent, Transform3DComponent]] as ComponentType[][]
          };
export const InputSystemDefinition = {
            system: InputSystem,
            queryWith: [[]] as ComponentType[][]
          };
export const EventSystemDefinition = {
            system: EventSystem,
            queryWith: [[EventComponent]] as ComponentType[][]
          };
export const MoveSquareSystemDefinition = {
            system: MoveSquareSystem,
            queryWith: [[Transform3DComponent, MoveSquareComponent]] as ComponentType[][]
          };
export const PerformanceTestOneSystemDefinition = {
            system: PerformanceTestOneSystem,
            queryWith: [[PerformanceTestOneComponent]] as ComponentType[][]
          };
export const PerformanceTestOneTwoSystemDefinition = {
            system: PerformanceTestOneTwoSystem,
            queryWith: [[PerformanceTestOneComponent, PerformanceTestTwoComponent]] as ComponentType[][]
          };
export const PerformanceTestThreeSystemDefinition = {
            system: PerformanceTestThreeSystem,
            queryWith: [[PerformanceTestThreeComponent]] as ComponentType[][]
          };
export const PerformanceTestTwoSystemDefinition = {
            system: PerformanceTestTwoSystem,
            queryWith: [[PerformanceTestTwoComponent]] as ComponentType[][]
          };
export const TestSystemDefinition = {
            system: TestSystem,
            queryWith: [[]] as ComponentType[][]
          };
export const TestThreeSystemDefinition = {
            system: TestThreeSystem,
            queryWith: [[TestTwoComponent, TestComponent, EventComponent]] as ComponentType[][]
          };
export const TestTwoSystemDefinition = {
            system: TestTwoSystem,
            queryWith: [[TestTwoComponent]] as ComponentType[][]
          };

