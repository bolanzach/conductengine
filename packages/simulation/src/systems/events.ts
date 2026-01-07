
interface ConductEvent {
  type: symbol;
  data: object;
}

const bufferedEvents: ConductEvent[] = [];


