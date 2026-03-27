import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { ValueB } from "./basicComponents.js";
const __query_FooSystem = { required: createSignatureFromComponents([ValueB]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_ValueB1_x = "ValueB." + ValueB[ComponentId] + ".x";
const $__conduct_engine_ValueB1_y = "ValueB." + ValueB[ComponentId] + ".y";
export default function FooSystem() {
    const $__conduct_engine_matches = query(__query_FooSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const ValueB_x = $__conduct_engine_columns[$__conduct_engine_ValueB1_x];
        const ValueB_y = $__conduct_engine_columns[$__conduct_engine_ValueB1_y];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            ValueB_x[$__conduct_engine_c] += ValueB_y[$__conduct_engine_c];
        }
    }
}
//# sourceMappingURL=fooSystem.js.map