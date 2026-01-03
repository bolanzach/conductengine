/**
 * A bit mask signature for a set of components.
 */
export type Signature = number[];

const BIT_CHUNK_SIZE = 32;

/**
 * Constructs a signature from a list of component ids.
 */
export function createSignature(components: number[]): Signature {
  if (!components.length) {
    return [];
  }

  const maxComponent = Math.max(...components);
  const signatureMask = new Array(
    Math.ceil((maxComponent + 1) / BIT_CHUNK_SIZE)
  ).fill(0);

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const chunkIndex = Math.floor(component / BIT_CHUNK_SIZE);
    const bitIndex = component % BIT_CHUNK_SIZE;
    signatureMask[chunkIndex] |= 1 << bitIndex;
  }

  return signatureMask;
}

/**
 * Checks whether the `other` signature is contained within the `sig` signature.
 */
export function signatureContains(sig: Signature, other: Signature): boolean {
  return sig.every((mask, index) => {
    return (mask & other[index]) === mask;
  });
}

/**
 * Checks whether the two signatures are equivalent.
 */
export function signatureEquals(sig: Signature, other: Signature): boolean {
  if (sig.length !== other.length) {
    return false;
  }
  for (let i = 0; i < sig.length; i++) {
    if (sig[i] !== other[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether two signatures have any overlapping bits.
 * Used for Not operator matching - returns true if any component is shared.
 */
export function signatureOverlaps(sig: Signature, other: Signature): boolean {
  const minLength = Math.min(sig.length, other.length);
  for (let i = 0; i < minLength; i++) {
    if ((sig[i] & other[i]) !== 0) {
      return true;
    }
  }
  return false;
}
