const net = require('net');
const readline = require('readline');


var client = new net.Socket();
client.connect(4200, '127.0.0.1', function() {
  console.log('> Connected\n');  // acknowledge socket connection
  // client.write('Hello, server! Love, Client.\n');
  startReading();
});
client.on('data', function (data) {
    $("#chat").text(data.toString());
});
client.on('close', function() {
  console.log('< Connection closed');
});
client.on('error', (err) => {
  console.log(err);
});

function startReading() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.prompt();
  rl.on('line', (line) => {
    client.write(line.trim());
    rl.prompt();
  }).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
  });
}
