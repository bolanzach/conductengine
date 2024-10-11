import { Component } from '../component';
import { NetworkedComponent } from './network';

export interface Position {
  x: number;
  y: number;
  // z: number;
}

export default class Transform2D extends Component {
  position: Position = { x: 0, y: 0 };
  rotation: Position = { x: 0, y: 0 };
}

export class NetworkedTransform extends NetworkedComponent {}
