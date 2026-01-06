import { Query } from "@conduct/ecs";
import { Transform3D } from "./components/transform3D.js";

export default function TestSystem(query: Query<[Transform3D]>) {
  query.iter(([_, t]) => {
    console.log("[TestSystem]", t.x);
  })
}
