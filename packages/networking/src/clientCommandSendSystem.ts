import { consumeClientCommandQueue } from "./clientCommandSend.js";
import { getClientTransport } from "./transport.js";

export default function ClientCommandSendSystem() {
  const transport = getClientTransport();
  if (!transport) return;

  const commands = consumeClientCommandQueue();
  for (let i = 0; i < commands.length; i++) {
    transport.send({ type: 'command', payload: commands[i]! });
  }
}