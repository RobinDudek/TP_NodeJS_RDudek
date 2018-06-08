const net = require('net');

const PORTS = process.env.PORTS.split(",") || [];
const PORT = process.env.PORT || 5000;

function roundRobinPort() {
    const port = PORTS[portIndex];
    portIndex++;

    if (portIndex > PORTS.length - 1) {
        portIndex = 0;
    }

    return port;
}

function randomPort() {
    return Math.floor(Math.random() * PORT.length)
}

//j'ai pas tout compris
var server = net.createServer(function (connection) {
    var selectedPort = randomPort();
    console.log('Connected on ' + selectedPort);

    const client = net.createConnection({ port: selectedPort });

    connection.on('end', () => {
        console.log('connection stopped');
    });
    client.on('end', () => {
        console.log('client disconnected');
    });
    connection.on('data', () => {
        connection.write(data);
    });
    client.on('error', () => {
        connection.end();
    });
    connection.on('error', () => {
        client.end();
    });
    client.pipe(connection);
    connection.pipe(client);
});
server.on('error', (err) => {
    throw err;
});

server.listen(PORT);