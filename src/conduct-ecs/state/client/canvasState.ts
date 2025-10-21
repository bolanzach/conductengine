import { createState } from "@/conduct-ecs/state";

export class Canvas {
  canvas = document.querySelector("canvas") as HTMLCanvasElement;
}

export const CanvasState = createState<Canvas>();
