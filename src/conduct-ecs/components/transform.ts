import { Component } from '../component';
import { Networked } from '../network';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export default class Transform extends Component {
  position: Position = { x: 0, y: 0, z: 0 };
  rotation: Position = { x: 0, y: 0, z: 0 };
}

@Networked('SERVER')
export class NetworkedTransform extends Transform {}
