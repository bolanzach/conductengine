import express from 'express';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';

export class GameServer {
  private instance: express.Application;
  private wsServer: WebSocketServer;
  private clientSockets: WebSocket[] = [];

  constructor() {
    this.instance = express();
    this.wsServer = new WebSocketServer({ port: 4242 });
  }

  public start() {
    this.routes();

    this.wsServer.on('connection', this.connectWsClient.bind(this));

    // this.wsServer.on('message', (message: string) => {
    //   console.log('Message from client', message);
    // });

    this.instance.listen(6969, () => {
      console.log('GameServer is running on port :6969');
    });
  }

  public send(message: string) {
    const buff = Buffer.from(message);
    this.clientSockets.forEach((client) => {
      client.send(buff);
    });
  }

  private routes() {
    this.instance.get('/', (req, res) => {
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
      console.log('Message from client', message.toString());
    });

    client.on('close', () => {
      this.clientSockets.splice(idx - 1, 1);
    });
  }
}
