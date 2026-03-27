let currentInputs = new Set();
let bufferedInputs = new Set();
let bufferedMouseInputs = new Map;
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
    });
    window.addEventListener('mouseup', (event) => {
        bufferedInputs.delete('mousedown');
        bufferedMouseInputs.delete(event.button);
        bufferedMouseInputs.set(event.button, event);
    });
}
function flushInputBuffer() {
    currentInputs.clear();
    for (const input of bufferedInputs) {
        currentInputs.add(input);
    }
    // Don't clear bufferedInputs in order to retain key states
}
export const Inputs = {
    isKeyPressed(key) {
        return currentInputs.has(key);
    },
    getMouseEvent(button) {
        return bufferedMouseInputs.get(button);
    }
};
export default function InputSystem() {
    flushInputBuffer();
}
//# sourceMappingURL=input.js.map