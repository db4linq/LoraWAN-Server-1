var lorawan = require('../src');

var serverProperties = {"port":1780};
var lwServer = new lorawan.Server(serverProperties);

lwServer.on("ready", (info, server) => {
  console.log("Ready: ", info);
});

lwServer.start();
