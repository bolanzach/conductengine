use std::alloc::Layout;
use std::any::{Any, TypeId};
use std::collections::HashMap;

/// Marker trait for types that can be stored as ECS components.
///
/// This is the equivalent of Bevy's `#[derive(Component)]`. Any struct
/// that implements this trait can be stored in a Column, attached to an
/// entity, and queried by systems.
///
/// For now it's just a marker — no methods. Later this is where you'd
/// hang metadata like storage policy or change detection hooks.
pub trait Component: 'static {}

/// Type-erased column storage for one component type.
///
/// Think of this like a `Vec<T>`, but the column doesn't know what `T` is
/// at compile time. It stores raw bytes and remembers enough info (size,
/// alignment, how to drop) to do the compiler's job manually.
///
/// This is the same idea as Bevy's `BlobVec`.
pub struct Column {
    /// The raw byte buffer. If this column stores Position { x: f32, y: f32 },
    /// then `data` holds [pos0_bytes, pos1_bytes, pos2_bytes, ...] packed tightly.
    data: Vec<u8>,

    /// Size of one item in bytes (e.g. 8 for Position { x: f32, y: f32 }).
    item_layout: Layout,

    /// Number of items currently stored.
    len: usize,

    /// Function pointer that knows how to drop one T.
    /// Needed because if T contains heap data (String, Vec, etc.),
    /// just freeing the bytes would leak memory.
    drop_fn: unsafe fn(*mut u8),

    /// The TypeId of the component stored in this column, used for debug safety checks.
    component_type: TypeId,
}

impl Column {
    /// Create a new empty column for storing components of type T.
    ///
    /// This is the only place where the concrete type T appears.
    /// After construction, the column works purely with raw bytes.
    pub fn new<T: Component>() -> Self {
        Column {
            data: Vec::new(),
            item_layout: Layout::new::<T>(),
            len: 0,
            drop_fn: drop_ptr::<T>,
            component_type: TypeId::of::<T>(),
        }
    }

    /// Number of items in this column.
    pub fn len(&self) -> usize {
        self.len
    }

    /// Size of one item in bytes.
    pub fn item_size(&self) -> usize {
        self.item_layout.size()
    }

    pub fn component_type(&self) -> TypeId {
        self.component_type
    }

    /// Push a component value into this column.
    ///
    /// Safety: the caller must ensure T matches the type this column was
    /// created with. We debug_assert on TypeId but that's stripped in release.
    pub fn push<T: Component>(&mut self, value: T) {
        debug_assert_eq!(TypeId::of::<T>(), self.component_type);

        // Get a byte pointer to `value`. This doesn't move or copy anything yet —
        // it's just "look at this value as raw bytes."
        let ptr = &value as *const T as *const u8;
        unsafe { self.push_raw(ptr); }

        // Tell Rust NOT to drop `value` — we now own those bytes in self.data.
        // Without this, Rust would drop `value` at the end of this function,
        // which would free any heap data (like a String's buffer) that we
        // just copied a pointer to.
        std::mem::forget(value);
    }

    pub unsafe fn push_raw(&mut self, ptr: *const u8) {
        let size = self.item_layout.size();
        let bytes = unsafe { std::slice::from_raw_parts(ptr, size) };
        self.data.extend_from_slice(bytes);
        self.len += 1;
    }

    /// Get a reference to the item at `index`, cast back to T.
    ///
    /// Safety: the caller must ensure T matches the type this column was created with.
    pub fn get<T: Component>(&self, index: usize) -> Option<&T> {
        if index >= self.len {
            return None;
        }
        debug_assert_eq!(TypeId::of::<T>(), self.component_type);

        let offset = index * self.item_layout.size();
        let ptr = self.data[offset..].as_ptr() as *const T;

        // SAFETY: we know the bytes at this offset are a valid T because
        // they were written by push<T>.
        Some(unsafe { &*ptr })
    }

    /// Get a mutable reference to the item at `index`, cast back to T.
    pub fn get_mut<T: Component>(&mut self, index: usize) -> Option<&mut T> {
        if index >= self.len {
            return None;
        }
        debug_assert_eq!(TypeId::of::<T>(), self.component_type);

        let offset = index * self.item_layout.size();
        let ptr = self.data[offset..].as_mut_ptr() as *mut T;

        Some(unsafe { &mut *ptr })
    }

    pub fn swap_remove(&mut self, index: usize) {
        let size = self.item_layout.size();
        let removed_offset = index * size;

        let ptr = self.data[removed_offset..].as_mut_ptr();
        unsafe { (self.drop_fn)(ptr); }

        let last = self.len() - 1;
        if index != last {
            let last_offset = last * size;
            self.data.copy_within(last_offset..last_offset + size, removed_offset);
        }

        self.data.truncate(last * size);
        self.len -= 1;
    }
}

/// Safety: ptr must point to a valid, initialized T.
/// This is the drop_fn stored in each Column — it casts the raw pointer
/// back to T and drops it, freeing any heap allocations T owns.
unsafe fn drop_ptr<T>(ptr: *mut u8) {
    unsafe { ptr.cast::<T>().drop_in_place() };
}

/// A unique entity identifier. Internally a monotonic u64 counter.
///
/// Opaque by design — if we later need to pack generation bits for
/// slot reuse, we change the internals without breaking callers.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct Entity(u64);

impl Entity {
    pub fn from_raw(id: u64) -> Self {
        Entity(id)
    }

    pub fn to_raw(self) -> u64 {
        self.0
    }
}

pub struct Archetype {
    /// The component types in this archetype, sorted for consistent identity.
    component_ids: Vec<TypeId>,
    /// One Column per component type, keyed by TypeId.
    columns: HashMap<TypeId, Column>,
    /// The entities stored in this archetype, in row order.
    entities: Vec<Entity>,
    /// Reverse map: entity → row index.
    entity_index: HashMap<Entity, usize>,
}

impl Archetype {
    pub fn new(columns: Vec<Column>) -> Self {
        let mut column_map = HashMap::new();
        let mut component_ids: Vec<TypeId> = Vec::new();

        for col in columns {
            let type_id = col.component_type();
            component_ids.push(type_id);
            column_map.insert(type_id, col);
        }

        Archetype {
            component_ids,
            columns: column_map,
            entities: Vec::new(),
            entity_index: HashMap::new(),
        }
    }

    pub fn contains(&self, entity: Entity) -> bool {
        self.entity_index.contains_key(&entity)
    }

    pub fn add_entity(&mut self, entity: Entity) {
        self.entity_index.insert(entity, self.entities.len());
        self.entities.push(entity);
    }

    pub fn remove_entity(&mut self, entity: Entity) {
        if !self.entity_index.contains_key(&entity) {
            return;
        }

        let index = self.entity_index[&entity];
        self.entities.swap_remove(index);
        self.entity_index.remove(&entity);

        if index < self.entities.len() {
            let swapped = self.entities[index];
            self.entity_index.insert(swapped, index);
        }

        for col in self.columns.values_mut() {
            col.swap_remove(index);
        }
    }

    pub fn add_component<T: Component>(&mut self, component: T) {
        let type_id = TypeId::of::<T>();
        let column = self.columns.get_mut(&type_id).unwrap();

        unsafe { column.push_raw(&component as *const T as *const u8); }
        std::mem::forget(component);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Position {
        x: f32,
        y: f32,
    }
    impl Component for Position {}

    #[test]
    fn new_column_is_empty() {
        let col = Column::new::<Position>();
        assert_eq!(col.len(), 0);
        assert_eq!(col.item_size(), std::mem::size_of::<Position>());
    }

    #[test]
    fn push_and_get() {
        let mut col = Column::new::<Position>();
        col.push(Position { x: 1.0, y: 2.0 });
        col.push(Position { x: 3.0, y: 4.0 });

        assert_eq!(col.len(), 2);

        let p0 = col.get::<Position>(0).unwrap();
        assert_eq!(p0.x, 1.0);
        assert_eq!(p0.y, 2.0);

        let p1 = col.get::<Position>(1).unwrap();
        assert_eq!(p1.x, 3.0);
        assert_eq!(p1.y, 4.0);
    }

    #[test]
    fn get_mut_modifies_in_place() {
        let mut col = Column::new::<Position>();
        col.push(Position { x: 0.0, y: 0.0 });

        col.get_mut::<Position>(0).unwrap().x = 99.0;

        assert_eq!(col.get::<Position>(0).unwrap().x, 99.0);
    }

    #[test]
    fn out_of_bounds_returns_none() {
        let col = Column::new::<Position>();
        assert!(col.get::<Position>(0).is_none());
    }

    /// A component with heap data to verify drop safety.
    struct Name {
        value: String,
    }
    impl Component for Name {}

    #[test]
    fn works_with_heap_data() {
        let mut col = Column::new::<Name>();
        col.push(Name { value: "hello".to_string() });
        col.push(Name { value: "world".to_string() });

        assert_eq!(col.get::<Name>(0).unwrap().value, "hello");
        assert_eq!(col.get::<Name>(1).unwrap().value, "world");
    }

    struct Velocity {
        dx: f32,
        dy: f32,
    }
    impl Component for Velocity {}

    #[test]
    fn archetype_add_entity_and_components() {
        let mut arch = Archetype::new(vec![
            Column::new::<Position>(),
            Column::new::<Velocity>(),
        ]);

        let e0 = Entity::from_raw(0);
        arch.add_entity(e0);
        arch.add_component(Position { x: 1.0, y: 2.0 });
        arch.add_component(Velocity { dx: 3.0, dy: 4.0 });

        let pos = arch.columns.get(&TypeId::of::<Position>()).unwrap();
        let vel = arch.columns.get(&TypeId::of::<Velocity>()).unwrap();

        assert_eq!(pos.len(), 1);
        assert_eq!(vel.len(), 1);

        let p = pos.get::<Position>(0).unwrap();
        assert_eq!(p.x, 1.0);
        assert_eq!(p.y, 2.0);

        let v = vel.get::<Velocity>(0).unwrap();
        assert_eq!(v.dx, 3.0);
        assert_eq!(v.dy, 4.0);
    }

    #[test]
    fn archetype_remove_entity_swap_removes() {
        let mut arch = Archetype::new(vec![
            Column::new::<Position>(),
        ]);

        let e0 = Entity::from_raw(0);
        let e1 = Entity::from_raw(1);
        let e2 = Entity::from_raw(2);

        arch.add_entity(e0);
        arch.add_component(Position { x: 0.0, y: 0.0 });
        arch.add_entity(e1);
        arch.add_component(Position { x: 1.0, y: 1.0 });
        arch.add_entity(e2);
        arch.add_component(Position { x: 2.0, y: 2.0 });

        arch.remove_entity(e0);

        assert!(!arch.contains(e0));
        assert!(arch.contains(e1));
        assert!(arch.contains(e2));

        let pos_col = arch.columns.get(&TypeId::of::<Position>()).unwrap();
        assert_eq!(pos_col.len(), 2);

        let e2_row = arch.entity_index[&e2];
        let p2 = pos_col.get::<Position>(e2_row).unwrap();
        assert_eq!(p2.x, 2.0);

        let e1_row = arch.entity_index[&e1];
        let p1 = pos_col.get::<Position>(e1_row).unwrap();
        assert_eq!(p1.x, 1.0);
    }
}