import { component, field, System, system, World } from "@lastolivegames/becsy";

@component
class Position {
  @field.float64 declare x: number;
  @field.float64 declare y: number;
  @field.float64 declare z: number;
  @field.float64 declare vx: number;
  @field.float64 declare vy: number;
  @field.float64 declare vz: number;
}

@system
class PositionSystem extends System {
  entities = this.query((q) => q.current.with(Position));

  execute() {
    for (const entity of this.entities.current) {
      const pos = entity.write(Position);
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.z += pos.vz;
    }
  }
}

(async () => {
  const world = await World.create();

  for (let i = 0; i < 20_000; i++) {
    world.createEntity(Position, {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 1000,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      vz: Math.random() * 2 - 1,
    });
  }

  const times: number[] = [];
  for (let iter = 0; iter < 1000; iter++) {
    const start = performance.now();
    await world.execute();
    times.push(performance.now() - start);
  }
  const trimmed = times.slice(10);
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  console.log("Becsy mean:", mean);
})();
