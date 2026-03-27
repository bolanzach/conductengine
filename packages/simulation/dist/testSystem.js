import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { Transform3D } from "./components/transform3D.js";
const __query_TestSystem = { required: createSignatureFromComponents([Transform3D]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_Transform3D1_x = "Transform3D." + Transform3D[ComponentId] + ".x";
export default function TestSystem() {
    const $__conduct_engine_matches = query(__query_TestSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const Transform3D_x = $__conduct_engine_columns[$__conduct_engine_Transform3D1_x];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            console.log("[TestSystem]", Transform3D_x[$__conduct_engine_c]);
        }
    }
}
//# sourceMappingURL=testSystem.js.map