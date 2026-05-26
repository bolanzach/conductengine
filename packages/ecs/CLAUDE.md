# Entity Component System (EDS)

This is the core ECS for the Conduct game engine. Refer to the [Conduct ECS README](./README.md) for usage instructions and examples.

## Principles

We strive for 2 main principles in the design of the ECS:

1. **Performance**: It is geared to be the fastest ECS possible using only Javascript (no WebAssembly).
2. **Ergonomics**: It is designed to be as easy to use as possible, with a simple API and minimal boilerplate.

## Implementation

At the heart of the ECS is the `compiler` which transforms the user-defined systems into highly optimized SoA (Structure of Arrays) data structures that can be efficiently iterated over.
The generated code is not meant to be super readable, reusable, etc.
Instead, it is meant to be as fast as possible, and should use all known optimization techniques to achieve that goal.

The underlying engine code should also strive to be as optimal as possible.

The implementation is inspired by Bevy and Flecs.

**Expect to support:**

**Entity Count**: hundreds of thousands of entities
**Component Count**: hundreds of unique components
**System Count**: hundreds of systems

All running at 60fps in the browser.
