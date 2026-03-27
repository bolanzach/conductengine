import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { ValueA, ValueB, ValueE } from "./basicComponents.js";
const __query_EarlyReturnSystem = { required: createSignatureFromComponents([ValueA, ValueB]), not: createSignatureFromComponents([ValueE]), cache: null, cacheGeneration: 0 };
const $__conduct_engine_ValueA1_x = "ValueA." + ValueA[ComponentId] + ".x";
const $__conduct_engine_ValueB2_x = "ValueB." + ValueB[ComponentId] + ".x";
const $__conduct_engine_ValueA1_y = "ValueA." + ValueA[ComponentId] + ".y";
const $__conduct_engine_ValueB2_y = "ValueB." + ValueB[ComponentId] + ".y";
export default function EarlyReturnSystem() {
    const $__conduct_engine_matches = query(__query_EarlyReturnSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const ValueA_x = $__conduct_engine_columns[$__conduct_engine_ValueA1_x];
        const ValueB_x = $__conduct_engine_columns[$__conduct_engine_ValueB2_x];
        const ValueA_y = $__conduct_engine_columns[$__conduct_engine_ValueA1_y];
        const ValueB_y = $__conduct_engine_columns[$__conduct_engine_ValueB2_y];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            if (ValueA_x[$__conduct_engine_c] > 2) {
                continue $__conduct_engine_entity_label;
            }
            ValueA_x[$__conduct_engine_c] += ValueB_x[$__conduct_engine_c];
            ValueA_y[$__conduct_engine_c] += ValueB_y[$__conduct_engine_c];
        }
    }
}
//# sourceMappingURL=earlyReturnSystem.js.map