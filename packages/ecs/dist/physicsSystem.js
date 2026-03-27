import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { Position, Velocity } from "./basicComponents.js";
const __query_PhysicsSystem = { required: createSignatureFromComponents([Position, Velocity]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_Position1_x = "Position." + Position[ComponentId] + ".x";
const $__conduct_engine_Velocity2_x = "Velocity." + Velocity[ComponentId] + ".x";
const $__conduct_engine_Position1_y = "Position." + Position[ComponentId] + ".y";
const $__conduct_engine_Velocity2_y = "Velocity." + Velocity[ComponentId] + ".y";
const $__conduct_engine_Position1_z = "Position." + Position[ComponentId] + ".z";
const $__conduct_engine_Velocity2_z = "Velocity." + Velocity[ComponentId] + ".z";
const $__conduct_engine_Velocity2_gravity = "Velocity." + Velocity[ComponentId] + ".gravity";
export default function PhysicsSystem() {
    const $__conduct_engine_matches = query(__query_PhysicsSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const Position_x = $__conduct_engine_columns[$__conduct_engine_Position1_x];
        const Velocity_x = $__conduct_engine_columns[$__conduct_engine_Velocity2_x];
        const Position_y = $__conduct_engine_columns[$__conduct_engine_Position1_y];
        const Velocity_y = $__conduct_engine_columns[$__conduct_engine_Velocity2_y];
        const Position_z = $__conduct_engine_columns[$__conduct_engine_Position1_z];
        const Velocity_z = $__conduct_engine_columns[$__conduct_engine_Velocity2_z];
        const Velocity_gravity = $__conduct_engine_columns[$__conduct_engine_Velocity2_gravity];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            Position_x[$__conduct_engine_c] += Velocity_x[$__conduct_engine_c];
            Position_y[$__conduct_engine_c] += Velocity_y[$__conduct_engine_c];
            Position_z[$__conduct_engine_c] += Velocity_z[$__conduct_engine_c];
            // Simple gravity effect
            Velocity_y[$__conduct_engine_c] -= Velocity_gravity[$__conduct_engine_c] * 0.016; // Assuming 60 FPS, so ~16ms per frame
        }
    }
}
//# sourceMappingURL=physicsSystem.js.map