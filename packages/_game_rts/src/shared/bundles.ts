import { ConductBundle } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Networked } from "@conduct/networking/networked";
import { BUNDLE } from "./index.js";
import { BoundingBox } from "./boundingBox.js";
import { SquadMember } from "./squadMember.js";
import { Squad } from "./squad.js";

export const SpaceMarineBundle: ConductBundle = [
  [Transform3D, { sx: 0.22, sy: 0.8, sz: 0.22 }],
  [Networked, { bundle: BUNDLE.SPACE_MARINE }],
  [BoundingBox, { hx: 0.22, hy: 0.4, hz: 0.22 }],
  [SquadMember],
];

export const SquadBundle: ConductBundle = [
  [Squad],
  [Transform3D],
  [Networked, { bundle: BUNDLE.SQUAD }],
];

export const GunBundle: ConductBundle = [
  [Transform3D, { sx: 0.05, sy: 0.05, sz: 0.25 }],
  [Networked, { bundle: BUNDLE.GUN }],
];

export const TileBundle: ConductBundle = [
  [Transform3D, { sx: 1, sy: 0.4, sz: 1 }],
];
