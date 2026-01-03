import { createState } from "@/conduct-ecs/state";
import { Canvas } from "@/conduct-ecs/state/client/canvasState";

export const InputKeyMouseLeft = "Mouse0";
export const InputKeyMouseRight = "Mouse2";

export class Input {
  private keyDownBuffer = new Map<string, KeyboardEvent | MouseEvent>();
  private currentDownKeys = new Map<string, KeyboardEvent | MouseEvent>();

  constructor(canvas: Canvas) {
    this.keyDownBuffer.set("mousemove", new MouseEvent("mousemove"));

    canvas.canvas.addEventListener("contextmenu", (event) =>
      event.preventDefault()
    );

    canvas.canvas.addEventListener("mousemove", (event) =>
      this.keyDownBuffer.set("mousemove", event)
    );

    canvas.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.keyDownBuffer.set("wheel", e);
    });

    canvas.canvas.addEventListener("keydown", (event) => {
      this.keyDownBuffer.set(event.key, event);
    });
    canvas.canvas.addEventListener("keyup", (event) => {
      // this.keyUpBuffer.set(event.key, event);
      this.keyDownBuffer.delete(event.key);
    });

    canvas.canvas.addEventListener("mousedown", (event) => {
      this.keyDownBuffer.set(`Mouse${event.button}`, event);
    });
    canvas.canvas.addEventListener("mouseup", (event) => {
      // this.keyUpBuffer.set(`Mouse${event.button}`, event);
      this.keyDownBuffer.delete(`Mouse${event.button}`);
    });

    // window.addEventListener("click", (event) => {});
  }

  isPressed(key: string): boolean {
    return this.currentDownKeys.has(key);
  }

  getEvent(key: string): KeyboardEvent | MouseEvent | undefined {
    return this.currentDownKeys.get(key);
  }

  get currentMousePosition() {
    return this.keyDownBuffer.get("mousemove") as MouseEvent;
  }

  flush() {
    this.currentDownKeys = new Map(this.keyDownBuffer);

    this.keyDownBuffer.delete("wheel");
  }
}

export const InputState = createState<Input>();
