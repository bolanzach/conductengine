import express from 'express';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';

import {
  NetworkTransport,
  TransportEvent,
} from '../conduct-core/networkTransport';

export class GameServer implements NetworkTransport {
  private instance: express.Application;
  private wsServer: WebSocketServer;
  private clientSockets: WebSocket[] = [];

  private networkId = 0;
  private networkEventHandlers: ((message: TransportEvent) => void)[] = [];

  constructor() {
    this.instance = express();
    this.wsServer = new WebSocketServer({ port: 4242 });
  }

  public start() {
    this.routes();

    this.wsServer.on('connection', this.connectWsClient.bind(this));

    this.instance.listen(6969, () => {
      console.log('GameServer is running on port :6969');
    });
  }

  produceNetworkEvent(message: TransportEvent) {
    const buff = JSON.stringify(message);
    console.log('Producing network event', message);
    this.clientSockets.forEach((client) => {
      client.send(buff, { binary: true });
    });
  }

  registerNetworkHandler(cb: (event: TransportEvent) => void) {
    this.networkEventHandlers.push(cb);
  }

  generateNetworkId(): number {
    return this.networkId++;
  }

  setNetworked(_: number) {
    // Not a valid operation on the server
  }

  isNetworked(id: number): boolean {
    return this.networkId > id;
  }

  private routes() {
    this.instance.get('/', (_, res) => {
      // do other things

      res.sendFile(path.join(__dirname, '/static/main.html'));
    });

    this.instance.get('/static/:file', (req, res) => {
      res.sendFile(path.join(__dirname, `/static/${req.params.file}`));
    });
  }

  private connectWsClient(client: WebSocket) {
    console.log('Client connected');
    const idx = this.clientSockets.push(client);

    client.on('message', (message: string) => {
      const data = JSON.parse(message.toString());
      this.networkEventHandlers.forEach((cb) => cb(data));
    });

    client.on('close', () => {
      this.clientSockets.splice(idx - 1, 1);
    });
  }
}
