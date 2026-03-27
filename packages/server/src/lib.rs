pub mod ecs;
pub mod wal;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Unique identifier for an entity.
/// Uses UUID so IDs are globally unique across server restarts and replicas.
pub type EntityId = Uuid;

/// Monotonically increasing tick number.
pub type TickNumber = u64;

/// Identifies a component type by name (e.g. "Position", "Health").
/// Simple and human-readable. Could become a hash/integer later for performance.
pub type ComponentType = String;

/// A single entry in the Write-Ahead Log.
///
/// The WAL stores state diffs only — not domain events.
/// The engine doesn't know what a "player" is. It only knows about
/// entities, components, and ticks.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LogEntry {
    /// Marks the beginning of a tick. All mutations until TickEnd
    /// belong to this tick and should be applied atomically by clients.
    TickStart { tick: TickNumber },

    /// Marks the end of a tick.
    TickEnd { tick: TickNumber },

    /// A new entity was created.
    EntityCreated { entity_id: EntityId },

    /// An entity was destroyed (all its components are implicitly gone).
    EntityDestroyed { entity_id: EntityId },

    /// A component was added to an entity for the first time.
    ComponentAdded {
        entity_id: EntityId,
        component_type: ComponentType,
        /// Raw bytes of the serialized component value.
        /// Stored as bytes so the WAL doesn't need to know concrete types.
        data: Vec<u8>,
    },

    /// An existing component's value changed.
    ComponentUpdated {
        entity_id: EntityId,
        component_type: ComponentType,
        /// Full replacement value (not a diff-of-diff).
        data: Vec<u8>,
    },

    /// A component was removed from an entity.
    ComponentRemoved {
        entity_id: EntityId,
        component_type: ComponentType,
    },
}