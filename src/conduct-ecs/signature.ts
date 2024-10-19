export type Signature = number[];

const BIT_CHUNK_SIZE = 32;

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

export function signatureEquals(sig: Signature, other: Signature): boolean {
  if (sig.length !== other.length) {
    return false;
  }
  return signatureContains(sig, other) && signatureContains(other, sig);
}
