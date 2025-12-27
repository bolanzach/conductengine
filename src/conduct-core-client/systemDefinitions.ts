import { SystemDefinition } from "@/conduct-ecs/system";
import CameraSystem from "@/conduct-ecs/systems/cameraSystem";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import CameraControllerSystem from "@/conduct-ecs/systems/client/cameraControllerSystem.client";
import { CameraControlComponent } from "@/conduct-ecs/components/cameraControl";
import InputSystem from "@/conduct-ecs/systems/client/inputSystem";
import WebGpuRendererSystem from "@/conduct-ecs/systems/client/render/webGpuRendererSystem.client";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import EventSystem from "@/conduct-ecs/systems/eventSystem";
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
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";


export const CameraSystemDefinition: SystemDefinition = {
  system: CameraSystem,
  queries: [{ dataComponents: [CameraComponent, Transform3DComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const CameraControllerSystemDefinition: SystemDefinition = {
  system: CameraControllerSystem,
  queries: [{ dataComponents: [CameraControlComponent, CameraComponent, Transform3DComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const InputSystemDefinition: SystemDefinition = {
  system: InputSystem,
  queries: [{ dataComponents: [], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const WebGpuRendererSystemDefinition: SystemDefinition = {
  system: WebGpuRendererSystem,
  queries: [{ dataComponents: [RenderComponent, Transform3DComponent], filterComponents: { not: [] as const, optional: [] as const } }, { dataComponents: [CameraComponent, Transform3DComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const EventSystemDefinition: SystemDefinition = {
  system: EventSystem,
  queries: [{ dataComponents: [], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const MoveSquareSystemDefinition: SystemDefinition = {
  system: MoveSquareSystem,
  queries: [{ dataComponents: [Transform3DComponent, MoveSquareComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const PerformanceTestOneSystemDefinition: SystemDefinition = {
  system: PerformanceTestOneSystem,
  queries: [{ dataComponents: [PerformanceTestOneComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const PerformanceTestOneTwoSystemDefinition: SystemDefinition = {
  system: PerformanceTestOneTwoSystem,
  queries: [{ dataComponents: [PerformanceTestOneComponent, PerformanceTestTwoComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const PerformanceTestThreeSystemDefinition: SystemDefinition = {
  system: PerformanceTestThreeSystem,
  queries: [{ dataComponents: [PerformanceTestThreeComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const PerformanceTestTwoSystemDefinition: SystemDefinition = {
  system: PerformanceTestTwoSystem,
  queries: [{ dataComponents: [PerformanceTestTwoComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const TestSystemDefinition: SystemDefinition = {
  system: TestSystem,
  queries: [{ dataComponents: [TestComponent], filterComponents: { not: [TestTwoComponent] as const, optional: [] as const } }]
};
export const TestThreeSystemDefinition: SystemDefinition = {
  system: TestThreeSystem,
  queries: [{ dataComponents: [TestTwoComponent, TestComponent, EventComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};
export const TestTwoSystemDefinition: SystemDefinition = {
  system: TestTwoSystem,
  queries: [{ dataComponents: [TestTwoComponent], filterComponents: { not: [] as const, optional: [] as const } }]
};

