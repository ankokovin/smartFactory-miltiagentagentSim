import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as path from 'path';
import {default as open} from 'open';

import Environment from './src/Environment';
import { handleMessage } from './src/utils';

const app = express.default()
const port = 3000


//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {

    const messageFn = (object : any) => {
        const message = JSON.stringify(object)
        //console.log(message);
        ws.send(message);
    }

    let environment: Environment

    //connection is up, let's add a simple simple event
    ws.on('message', (message: any) => {
        environment = handleMessage(message, environment, messageFn)
    });
});

app.get('/', function(req, res) {
    console.log('root')
    res.sendFile(path.join(__dirname, '../..', '/public/index.html'))
})

app.get('/js/:file', function(req, res) {
    const file = req.params.file;
    console.log(`get file ${file}`);
    res.sendFile(path.join(__dirname, '../..', `/public/js/${file}`));
})

app.get('/css/:file', function(req, res) {
    const file = req.params.file;
    console.log(`get file ${file}`);
    res.sendFile(path.join(__dirname, '../..', `/public/css/${file}`));
})

//start our server
server.listen(process.env.PORT || port, () => {
    console.log(server.address());
    const address : any = server.address()
    open(`http://localhost:${address.port}`)
});