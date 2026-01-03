import { Component } from "@/conduct-ecs/component";
import { EVENTS } from "@/conduct-ecs/event";

export default class EventComponent extends Component {
  [EVENTS]? = new Map<number, any[]>();
}
