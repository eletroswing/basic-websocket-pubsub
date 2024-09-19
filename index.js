import dotenv from "dotenv";
import crypto from "crypto";
import { WebSocketServer } from "ws";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const PORT = process.env.PORT || 8000;
const WSServer = new WebSocketServer({
    port: PORT,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    }
});

const clients = new Map();

const randomId = (length = 8) => crypto.randomBytes(length).toString('hex');

WSServer.on('connection', (ws, req) => {
    console.log('Connected WebSocket URL:', req.url);
    const id = randomId(32);

    if (req.url.trim() === "/" || req.url.trim() === "") return ws.close(1000, JSON.stringify({ error: "Invalid URL" }))

    const url = req.url.trim().split('/')
    const channel = url[1]

    ws.id = id;
    clients.set(id, {
        ws: ws,
        channel: channel,
        name:  url[2] != "publisher" ? "listeners" : "publishers"
    });

    ws.on('message', (message) => {
        const clientData = clients.get(id);
        if (clientData.name === "publishers") {
            const clientsListeing = Array.from(clients.values()).filter(client => client.name === "listeners" && client.channel === clientData.channel);
            clientsListeing.forEach(client => {
                client.ws.send(message);
            });
        }
    });

    ws.on('error', () => {
        clients.delete(id);
        console.log('Connection errored');
    })

    ws.on('close', () => {
        clients.delete(id);
        console.log('Connection closed');
    });
});

console.log('running')