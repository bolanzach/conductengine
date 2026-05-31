import type { ConductBundle } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Networked } from "@conduct/networking/networked";
import { BUNDLE } from "./index.js";

export const SpaceMarineBundle: ConductBundle = [
  [Transform3D, { sx: 0.5, sy: 0.8, sz: 0.5 }],
  [Networked, { bundle: BUNDLE.SPACE_MARINE }],
];

export const GroundBundle: ConductBundle = [
  [Transform3D, { sx: 30, sy: 0.2, sz: 30 }],
];