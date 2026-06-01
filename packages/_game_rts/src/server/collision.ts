import { GridSpatialIndex } from "../shared/gridSpatialIndex.js";
import { CollisionService } from "../shared/collisionService.js";

const spatialIndex = new GridSpatialIndex();
export const collisionService = new CollisionService(spatialIndex);