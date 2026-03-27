import { ComponentId, createSignatureFromComponents, query } from "@conduct/ecs";
import { Person } from "./basicComponents.js";
const __query_PersonSystem = { required: createSignatureFromComponents([Person]), not: [], cache: null, cacheGeneration: 0 };
const $__conduct_engine_Person1_age = "Person." + Person[ComponentId] + ".age";
const $__conduct_engine_Person1_name = "Person." + Person[ComponentId] + ".name";
export default function PersonSystem() {
    const $__conduct_engine_matches = query(__query_PersonSystem);
    for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) {
        const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i];
        const $__conduct_engine_columns = $__conduct_engine_arch.columns;
        const Person_age = $__conduct_engine_columns[$__conduct_engine_Person1_age];
        const Person_name = $__conduct_engine_columns[$__conduct_engine_Person1_name];
        const $__conduct_engine_count = $__conduct_engine_arch.count;
        $__conduct_engine_entity_label: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) {
            if (Person_age[$__conduct_engine_c] < 18) {
                Person_name[$__conduct_engine_c] = "Minor";
            }
            else {
                Person_name[$__conduct_engine_c] = "Adult";
            }
        }
    }
}
//# sourceMappingURL=personSystem.js.map