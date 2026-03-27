import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { ValueA } from "./basicComponents.js";
const __query_BasicSystem = { required: createSignatureFromComponents([ValueA]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_ValueA1_x = "ValueA." + ValueA[ComponentId] + ".x";
const $__conduct_engine_ValueA1_y = "ValueA." + ValueA[ComponentId] + ".y";
export default function BasicSystem() {
    const $__conduct_engine_matches = query(__query_BasicSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const ValueA_x = $__conduct_engine_columns[$__conduct_engine_ValueA1_x];
        const ValueA_y = $__conduct_engine_columns[$__conduct_engine_ValueA1_y];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            ValueA_x[$__conduct_engine_c] += ValueA_y[$__conduct_engine_c];
        }
    }
}
//# sourceMappingURL=basicSystem.js.map