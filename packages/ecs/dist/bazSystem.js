import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { ValueD } from "./basicComponents.js";
const __query_BazSystem = { required: createSignatureFromComponents([ValueD]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_ValueD1_x = "ValueD." + ValueD[ComponentId] + ".x";
const $__conduct_engine_ValueD1_y = "ValueD." + ValueD[ComponentId] + ".y";
export default function BazSystem() {
    const $__conduct_engine_matches = query(__query_BazSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const ValueD_x = $__conduct_engine_columns[$__conduct_engine_ValueD1_x];
        const ValueD_y = $__conduct_engine_columns[$__conduct_engine_ValueD1_y];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            ValueD_x[$__conduct_engine_c] += ValueD_y[$__conduct_engine_c];
        }
    }
}
//# sourceMappingURL=bazSystem.js.map