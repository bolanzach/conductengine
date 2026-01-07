let currentInputs: Set<string> = new Set();
let bufferedInputs: Set<string> = new Set();

export function listenForInput() {
  window.addEventListener('keydown', (event) => {
    bufferedInputs.add(event.key);
  });
  window.addEventListener('keyup', (event) => {
    bufferedInputs.delete(event.key);
  });
}

function flushInputBuffer() {
  currentInputs.clear();
  for (const input of bufferedInputs) {
    currentInputs.add(input);
  }
  // Don't clear bufferedInputs in order to retain key states
}

export const CURRENT_INPUTS = currentInputs

export default function InputSystem() {
  flushInputBuffer()
}
