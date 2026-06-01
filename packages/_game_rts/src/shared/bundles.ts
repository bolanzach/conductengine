import type { ConductBundle } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Networked } from "@conduct/networking/networked";
import { BUNDLE } from "./index.js";
import { BoundingBox } from "./boundingBox.js";

export const SpaceMarineBundle: ConductBundle = [
  [Transform3D, { sx: 0.22, sy: 0.8, sz: 0.22 }],
  [Networked, { bundle: BUNDLE.SPACE_MARINE }],
  [BoundingBox, { hx: 0.22, hy: 0.4, hz: 0.22 }],
];

export const TileBundle: ConductBundle = [
  [Transform3D, { sx: 1, sy: 0.4, sz: 1 }],
];