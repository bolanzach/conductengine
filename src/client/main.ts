import 'reflect-metadata'

import { World} from '../conduct-ecs';
import { init} from './gpu'

import * as _ from "lodash"

console.dir(_);

const w = new World();

const message: string = "hello client";

function main() {
  console.log(message);
}

main();

init();
