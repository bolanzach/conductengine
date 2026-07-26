import { GridSpatialIndex } from "./gridSpatialIndex.js";
import { CollisionService } from "./collisionService.js";

const spatialIndex = new GridSpatialIndex();
export const collisionService = new CollisionService(spatialIndex);