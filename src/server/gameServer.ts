import path from 'path';
import express from 'express';

export class GameServer {
  private instance: express.Application;

  constructor() {
    this.instance = express();
  }

  public start() {
    this.routes();

    this.instance.listen(6969, () => {
      console.log('Server is running on port :6969');
    });
  }

  private routes() {
    this.instance.get('/', (req, res) => {
      // do other things

      res.sendFile(path.join(__dirname, '/static/main.html'));
    });


    this.instance.get("/static/:file", (req, res) => {
      res.sendFile(path.join(__dirname, `/static/${req.params.file}`));
    });
  }
}

