import { Query } from "@conduct/ecs";
import { Transform2D } from "@conduct/simulation";
import { DomRenderer } from "./domRenderer";

export default function DomRendererSystem(query: Query<[Transform2D, DomRenderer]>) {
  query.iter(([_, transform, domRenderer]) => {
    domRenderer.element.style.transform = `translateX(${transform.x}px)  translateY(${transform.y}px)`;
  });
}
