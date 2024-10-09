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

  private networkEventHandler?: (message: TransportEvent) => void;
  private clientConnectHandler?: (clientId: number) => void;

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
    const buff = Buffer.from(message.toString());
    this.clientSockets.forEach((client) => {
      client.send(buff);
    });
  }

  registerNetworkHandler(cb: (event: TransportEvent) => void) {
    this.networkEventHandler = cb;
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

    this.clientConnectHandler?.(idx);

    client.on('message', (message: string) => {
      const data = JSON.parse(message.toString());
      this.networkEventHandler?.(data);
    });

    client.on('close', () => {
      this.clientSockets.splice(idx - 1, 1);
    });
  }
}
