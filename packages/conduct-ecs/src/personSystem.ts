import { Query } from "./core.js";
import { Person } from "./basicComponents.js";

export default function PersonSystem(query: Query<[Person]>): void {
  query.iter(([_, p]) => {
    if (p.age < 18) {
      p.name = "Minor";
    } else {
      p.name = "Adult";
    }
    console.log(p.name)
  });
}
