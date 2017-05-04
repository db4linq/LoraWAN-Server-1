LoRaWAN JS Server – fast, minimalist open-source library for node that allows you to create LoRaWAN network-server.

## Features

* Handling of uplink messages from Gateways
* Scheduling of downlink data transmissions to Gateways
* Handling packets from endpoints
* Decryption packets from endpoint Nodes
* Packets creation to endpoint Nodes

Detailed, but short description of the general LoRaWAN architecture in Wiki page.

## Installation
``` bash
  $ [sudo] npm install lorawan-js
```

## Example

### Simple LoRaWAN network server

```javascript

var lorawan = require('lorawan-js');

var prop = {"port":1780};
var lwServer = new lorawan.Server(prop);

lwServer.start();

lwServer.on("ready", (info, server) => {
  console.log("Ready: ", info);
});


lwServer.on('pushdata_status', (message, clientInfo) => {
  console.log("[Upstream] IN pushdata - status message from gateway: ", message.gateway);
});

```


### LoRaWAN node package decryption


```javascript

var lorawan = require('lorawan-js');

var prop = {"port":1780};
var lwServer = new lorawan.Server(prop);

lwServer.start();

lwServer.on("ready", (info, server) => {
  console.log("Ready: ", info);
});


lwServer.on('pushdata_rxpk', (message, clientInfo) => {

  var pdata = message.data.rxpk[0].data;
  var buff = new Buffer(pdata, 'Base64');

  var MYpacket = lorawan.Packet(buff);

  console.log("[Upstream] IN pushdata RXPK - ", MYpacket.MType.Description ," from: ", MYpacket.Buffers.MACPayload.FHDR.DevAddr);

  if (MYpacket.Buffers.MACPayload.FHDR.DevAddr.toString('hex')=="be7a0000") {

     var NwkSKey = new Buffer('000102030405060708090A0B0C0D0E0F', 'hex');
     var AppSKey = new Buffer('000102030405060708090A0B0C0D0E0F', 'hex');

     var MYdec = MYpacket.decryptWithKeys(AppSKey, NwkSKey);

     console.log("MY Time: " + MYdec.readUInt32LE(0).toString() + " Battery: " + MYdec.readUInt8(4).toString() + " Temperature: " + MYdec.readUInt8(5).toString() + " Lat: " + MYdec.readUInt32LE(6).toString() + " - Long: " + MYdec.readUInt32LE(10).toString());

  } else if(MYpacket.Buffers.MACPayload.FHDR.DevAddr.toString('hex')=="03ff0001") {

    var NwkSKey = new Buffer('2B7E151628AED2A6ABF7158809CF4F3C', 'hex');
    var AppSKey = new Buffer('2B7E151628AED2A6ABF7158809CF4F3C', 'hex');


    var MYdec = MYpacket.decryptWithKeys(AppSKey, NwkSKey);
    console.log("MYdec: ", MYdec.toString('utf8'), " - ", MYdec.length);

  }  else {

    console.log("New device: ", MYpacket.Buffers.MACPayload.FHDR.DevAddr.toString('hex'));

  }

});

```



## Documentation & Tutorials


## Links
* [Lora network packet forwarder project](https://github.com/Lora-net/packet_forwarder)
* [LoRaWAN endpoint stack implementation](https://github.com/Lora-net/LoRaMac-node)
* [LoRaWAN endpoint stack implementation for Arduino environment](https://github.com/matthijskooijman/arduino-lmic)

## TODO
* LoRaWAN JS API description
* LoRaWAN JS package decryption example
* LoRaWAN JS to MQTT Bridge example
* Over-the-Air Activation (OTAA) example
* Activation by Personalization (ABP) example


## Filing issues

If something isn't working like you think it should, please read the documentation, especially the Getting Started guides. If you have a question not covered in the documentation or want to report a bug, the best way to ensure it gets addressed is to file it in the appropriate issues tracker. If we can't reproduce the issue, we can't fix it. Please list the exact steps required to reproduce the issue. Include versions of your OS, Node.js, etc. Include relevant logs or sample code.

You might find a security issue: in that case, email at hello@ioberry.com.

## Contributing

Anyone can help make this project better. If you want to contribute, but don't know where to get started, this is for you:
* Join the discussions, pop into [our slack channel](https://ioberry.slack.com/messages/C57QC10TH)
* Report bugs or make feature-requests by [opening an issue](https://github.com/ioberry/LoraWAN-Server/issues)
* Fix issues or improve documentation by [creating pull-requests](https://github.com/ioberry/LoraWAN-Server/pulls)
* Submit articles and guides which are also part of the documentation


## LICENSE - "MIT License"

Copyright 2016 Dmitry Sukhamera, http://ioberry.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
