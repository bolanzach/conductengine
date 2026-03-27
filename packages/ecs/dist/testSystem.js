import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { ValueE } from "./basicComponents.js";
const __query_TestSystem = { required: createSignatureFromComponents([ValueE]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_ValueE1_x = "ValueE." + ValueE[ComponentId] + ".x";
const $__conduct_engine_ValueE1_y = "ValueE." + ValueE[ComponentId] + ".y";
export default function TestSystem() {
    const $__conduct_engine_matches = query(__query_TestSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const ValueE_x = $__conduct_engine_columns[$__conduct_engine_ValueE1_x];
        const ValueE_y = $__conduct_engine_columns[$__conduct_engine_ValueE1_y];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            ValueE_x[$__conduct_engine_c] += ValueE_y[$__conduct_engine_c];
        }
    }
}
//# sourceMappingURL=testSystem.js.map