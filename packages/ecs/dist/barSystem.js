import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { ValueC } from "./basicComponents.js";
const __query_BarSystem = { required: createSignatureFromComponents([ValueC]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_ValueC1_x = "ValueC." + ValueC[ComponentId] + ".x";
const $__conduct_engine_ValueC1_y = "ValueC." + ValueC[ComponentId] + ".y";
export default function BarSystem() {
    const $__conduct_engine_matches = query(__query_BarSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const ValueC_x = $__conduct_engine_columns[$__conduct_engine_ValueC1_x];
        const ValueC_y = $__conduct_engine_columns[$__conduct_engine_ValueC1_y];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            ValueC_x[$__conduct_engine_c] += ValueC_y[$__conduct_engine_c];
        }
    }
}
//# sourceMappingURL=barSystem.js.map