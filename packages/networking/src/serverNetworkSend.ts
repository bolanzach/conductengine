import { tick } from "@conduct/ecs";
import { snapshotEntities } from "./serverNetworkSnapshotSystem";
import { getServerTransport } from "./serverTransport.js";

export default function ServerNetworkSendSystem() {
  const transport = getServerTransport();
  if (!transport || snapshotEntities.length === 0) return;

  transport.broadcast({
    type: 'snapshot',
    payload: {
      tick,
      entities: snapshotEntities,
      destroyed: [],
    },
  });
}