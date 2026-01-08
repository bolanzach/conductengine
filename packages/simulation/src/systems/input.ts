let currentInputs: Set<string> = new Set();
let bufferedInputs: Set<string> = new Set();
let bufferedMouseInputs = new Map<number, MouseEvent>

export function listenForInput() {
  window.addEventListener('keydown', (event) => {
    bufferedInputs.add(event.key);
  });
  window.addEventListener('keyup', (event) => {
    bufferedInputs.delete(event.key);
  });
  window.addEventListener('mousedown', (event) => {
    bufferedInputs.add('mousedown');
    bufferedMouseInputs.set(event.button, event);
  })
  window.addEventListener('mouseup', (event) => {
    bufferedInputs.delete('mousedown');
    bufferedMouseInputs.delete(event.button);
    bufferedMouseInputs.set(event.button, event);
  })
}

function flushInputBuffer() {
  currentInputs.clear();
  for (const input of bufferedInputs) {
    currentInputs.add(input);
  }
  // Don't clear bufferedInputs in order to retain key states
}

export const Inputs = {
  isKeyPressed(key: string): boolean {
    return currentInputs.has(key);
  },

  getMouseEvent(button: number): MouseEvent | undefined {
    return bufferedMouseInputs.get(button);
  }
}

export default function InputSystem() {
  flushInputBuffer()
}
