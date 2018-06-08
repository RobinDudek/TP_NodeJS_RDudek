const path = require("path");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const uuidv4 = require("uuid/v4");
const Redis = require("redis");

const app = express();

const client = Redis.createClient();
const redisPublisher = Redis.createClient();
const redisSubscriber = Redis.createClient();

const PUBLIC_FOLDER = path.join(__dirname, "../public");
const PORT = 5002;

const socketsPerChannels = new Map();
const channelsPerSocket = new WeakMap();

// Initialize a simple http server
const httpserver = http.createServer(app);

// Initialize the WebSocket server instance
const wss = new WebSocket.Server({ httpserver });

redisSubscriber.on("message", function (channel, data) {
    broadcastToSockets(channel, data);
});
/*
 * Subscribe a socket to a specific channel.
 */
function subscribe(socket, channel) {
    let socketSubscribed = socketsPerChannels.get(channel) || new Set();
    let channelSubscribed = channelsPerSocket.get(socket) || new Set();

    if (socketSubscribed.size == 0) {
        redisSubscriber.subscribe(channel);
    }

    socketSubscribed = socketSubscribed.add(socket);
    channelSubscribed = channelSubscribed.add(channel);

    socketsPerChannels.set(channel, socketSubscribed);
    channelsPerSocket.set(socket, channelSubscribed);
}

/*
 * Unsubscribe a socket from a specific channel.
 */
function unsubscribe(socket, channel) {
    let socketSubscribed = socketsPerChannels.get(channel) || new Set();
    let channelSubscribed = channelsPerSocket.get(socket) || new Set();

    socketSubscribed.delete(socket);
    channelSubscribed.delete(channel);

    if (socketSubscribed.size == 0) {
        redisSubscriber.unsubscribe(channel);
    }

    socketsPerChannels.set(channel, socketSubscribed);
    channelsPerSocket.set(socket, channelSubscribed);
}

/*
 * Subscribe a socket from all channels.
 */
function unsubscribeAll(socket) {
    const channelSubscribed = channelsPerSocket.get(socket) || new Set();

    channelSubscribed.forEach(channel => {
        unsubscribe(socket, channel);
    });
}

/*
 * Broadcast a message to all sockets connected to this server.
 */
function broadcastToSockets(channel, data) {
    const socketSubscribed = socketsPerChannels.get(channel) || new Set();

    socketSubscribed.forEach(client => {
        client.send(data);
    });
}

// Broadcast message from client
wss.on("connection", ws => {
    ws.on('close', () => {
        unsubscribeAll(ws);
    });

    ws.on("message", data => {
        const message = JSON.parse(data.toString());

        switch (message.type) {
            case 'subscribe':
                client.lrange(message.channel, 0, 100, (err, result) => {
                    result.map(data => ws.send(data));
                });
                subscribe(ws, message.channel);
                break;
            case 'chat':

                break;
            default:
                client.lpush(message.channel, data);
                redisPublisher.publish(message.channel, data);

                broadcastToSockets(message.channel, data);
                break;
        }
    });
});

// Assign a random channel to people opening the application
app.get("/", (req, res) => {
    res.redirect(`/${uuidv4()}`);
});

app.get("/:channel", (req, res, next) => {
    res.sendFile(path.join(PUBLIC_FOLDER, "index.html"), {}, err => {
        if (err) {
            next(err);
        }
    });
});

app.use(express.static(PUBLIC_FOLDER));



/*********** COOKIE ***********/
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const SECRET = 'a_very_strong_password';
const COOKIE_KEY = 'CUSTOM_SESSID';

const users = {
    admin: 'admin',
    user: 'user'
};

const sessionStorage = {
    get: (id, key) => {
        if (sessionStorage.data.hasOwnProperty(id)) {
            return sessionStorage.data[id][key];
        }
    },
    set: (id, key, value) => {
        if (!sessionStorage.data.hasOwnProperty(id)) {
            sessionStorage.data[id] = {};
        }
        sessionStorage.data[id][key] = value;
    },
    data: {}
};

function hashCookie(value) {
    return crypto.createHmac('sha256', SECRET)
        .update(value)
        .digest('hex');
}

function auth(request) {
    var data = (request.get('authorization') || ':').replace('Basic ', '');
    data = Buffer.from(data, 'base64').toString().split(':', 2);
    var user = {
        name: data[0],
        password: data[1] || ''
    };
    return user;
}
app.use(cookieParser());
app.use((request, response, next) => {
    let session = request.cookies[COOKIE_KEY];
    if (session != undefined) {
        session = JSON.parse(session);
        if (hashCookie(session.user) !== session.signature) {
            return response.status(401).send('Access denied');
        } else {
            request.session = session;
            return next();
        }
    }
    var user = auth(request);
    if (!user || !users[user.name] || users[user.name] !== user.password) {
        response.set('WWW-Authenticate', 'Basic realm="Vos identifiants"');
        return response.status(401).send('Access denied');
    }
    request.session = {
        user: user.name,
        signature: hashCookie(user.name)
    };
    response.cookie(COOKIE_KEY, JSON.stringify(request.session), { expires: new Date(Date.now() + 3600 * 24 * 365) });
    return next();
});

server.listen(PORT, () => {
    console.log(`Server started on port ${server.address().port}`);
});
