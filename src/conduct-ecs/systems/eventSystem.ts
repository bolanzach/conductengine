// import { SystemInit } from '../system';
// import { World } from '../world';
//
// interface Event {
//   type: string;
//   // subject: string;
//   data: object;
// }
//
// interface TestEvent extends Event {
//   type: 'subject::*::*' | 'subject::action::*' | 'subject::action::id';
//   // subject: 'one' | 'other';
//   data: {
//     id: number;
//     name: string;
//   };
// }
//
// interface TestEventTwo extends Event {
//   type: 'subject2::action::id';
//   // subject: 'two';
//   data: {
//     id: number;
//     name: string;
//   };
// }
//
// interface TestEventThree extends Event {
//   type: 'subject3::action::id';
//   // subject: 'three';
//   data: {
//     id: number;
//     name: string;
//   };
// }
//
// type EventType = TestEvent | TestEvent | TestEventTwo | TestEventThree;
//
// export default class EventSystem<EventTypes extends Event>
//   implements SystemInit
// {
//   private world!: World;
//   private eventsToPublish: EventTypes[] = [];
//   private handlers: ((event: EventTypes) => void)[] = [];
//
//   init(w: World) {
//     this.world = w;
//   }
//
//   publish(event: EventTypes) {
//     this.eventsToPublish.push(event);
//   }
//
//   // consumeQuery<T extends EventTypes['type'], S extends EventTypes['subject']>(
//   //   eventQuery: { type: T; subject: S },
//   //   cb: (event: Extract<EventTypes, { type: T; subject: S }>) => void
//   // ) {
//   //   // @ts-expect-error expanding the cb type
//   //   this.handlers.push(cb);
//   // }
//
//   consume<T extends EventTypes['type']>(
//     _: T,
//     cb: (event: Extract<EventTypes, { type: T }>) => void
//   ) {
//     // @ts-expect-error expanding the cb type
//     this.handlers.push(cb);
//   }
// }
//
// const eventSystem = new EventSystem<EventType>();
//
// eventSystem.publish({
//   type: 'subject::action::id',
//   data: {
//     id: 0,
//     name: 'test',
//   },
// });
//
// eventSystem.consume('subject2::action::id', (_) => {
//   event.type;
// });
//
// // eventSystem.consumeQuery(
// //   {
// //     type: 'subject::action::id',
// //     subject: 'one',
// //   },
// //   (event: TestEventTwo) => {
// //     event.subject;
// //   }
// // );

import { SystemInit } from '../system';
import { World } from '../world';

export default class EventSystem implements SystemInit {
  init(world: World) {}
}
