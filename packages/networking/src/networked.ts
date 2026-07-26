/**
 * Entities with this component are included in network snapshots.
 */
export class Networked {
  bundle = 0;
  owner = 0;
  /** Position among same-type siblings for deterministic child ordering. */
  index = 0;
}