// RTS shared game logic (components, shared systems, types)
// This code runs on both client and server.

export const BUNDLE = {
  PLAYER: 1,
} as const;

// export type Bundle = Record<typeof BUNDLE, () => number>
