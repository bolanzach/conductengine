import CameraSystem from "@/conduct-ecs/systems/cameraSystem";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import WebGpuRendererSystem from "@/conduct-ecs/systems/client/render/webGpuRendererSystem.client";
import { getCameraViewProjectionMatrix } from "@/conduct-ecs/components/cameraComponent";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import EventSystem from "@/conduct-ecs/systems/eventSystem";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import TestSystem from "@/game/src/systems/testSystem";
import { Component, ComponentType } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";


export const CameraSystemDefinition = {
            system: CameraSystem,
            queryWith: [CameraComponent, Transform3DComponent] as ComponentType[]
          };
export const WebGpuRendererSystemDefinition = {
            system: WebGpuRendererSystem,
            queryWith: [RenderComponent] as ComponentType[]
          };
export const EventSystemDefinition = {
            system: EventSystem,
            queryWith: [EventComponent] as ComponentType[]
          };
export const TestSystemDefinition = {
            system: TestSystem,
            queryWith: [TestComponent, TestTwoComponent] as ComponentType[]
          };
export const TestThreeSystemDefinition = {
            system: TestThreeSystem,
            queryWith: [TestTwoComponent, TestComponent, EventComponent] as ComponentType[]
          };
export const TestTwoSystemDefinition = {
            system: TestTwoSystem,
            queryWith: [TestTwoComponent] as ComponentType[]
          };

