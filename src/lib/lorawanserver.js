/*!
 * lorawan-js
 * Copyright(c) 2017 Dmitry Sukhamera
 * MIT Licensed
 */

'use strict';

const UDP_MSG_PRMBL_OFF = 12;
const PROTOCOL_VERSION  = 2;

const PKT_PUSH_DATA     = 0;
const PKT_PUSH_ACK      = 1;
const PKT_PULL_DATA     = 2;
const PKT_PULL_RESP     = 3;
const PKT_PULL_ACK      = 4;
const PKT_TX_ACK        = 5;

/**
 * Module dependencies.
 */
var dgram  = require('dgram');
var EventEmitter = require("events").EventEmitter;

function Server(opts, callback) {

  if (!(this instanceof Server)) {
    return new Server(opts, callback);
  }

  EventEmitter.call(this);

  this.opts = {};
  this.gateways = {};

  if (opts) {
    this.opts.address = opts.address || '0.0.0.0';
    if (opts.portup && opts.portdown && !opts.port) {
      if ( opts.portup == opts.portdown ) {
        this.opts.port = opts.portup;
      } else {
        this.opts.portup = opts.portup;
        this.opts.portdown = opts.portdown;
      }
    } else {
      this.opts.port = opts.port || 1700;
    }
  } else {
    this.opts.address = '0.0.0.0';
    this.opts.port = 1700;
  }

  this.status = "STOP";
  var that = this;

}


module.exports = Server;

Server.prototype = Object.create(EventEmitter.prototype);

Server.prototype.toString = function() {
  return 'ioberry Lorawan Server';
};

Server.prototype.stop = function stop() {

  if (this.status && this.opts.port) {

    this.socket.close();

  } else if (this.status){

    this.socketup.close();
    this.socketdown.close();

  } else {

    console.log("Nothing to stop");

  }

};

Server.prototype.start = function start() {

  if (this.opts.port) {

    this.socket = dgram.createSocket('udp4');
    this.socket.bind(this.opts.port,this.opts.address);

    this.socket.on('listening', () => { this.status = "RUN"; this.emit("ready", this.socket.address() ); });
    this.socket.on('close', () => { this.status = "STOP"; this.emit("close", this.socket.address() ); });

    this.socket.on('error', (err) => {
      this.socket.close();
      this.emit("error", err);
    });

    this.socket.on('message', (socketData, clientInfo) => {
      parseMessage(this, socketData, clientInfo);
    });

    this.on('pushdata', (message, clientInfo) => {

      var tokens = {"h":message.tokenH, "l": message.tokenL};

      if (message.data.stat) {
        this.emit("pushdata_status", message, clientInfo);
      } else if (message.data.rxpk) {
        this.emit("pushdata_rxpk", message, clientInfo);
      }

      push_ack(this, clientInfo, tokens);

    });




    this.on('pulldata', (message, clientInfo) => {
      var tokens = {"h":message.tokenH, "l": message.tokenL};
      pull_ack(this, clientInfo, tokens);
    });

    this.on('pullack', (message, clientInfo) => {

    });

  } else {

    this.socketup = dgram.createSocket('udp4');
    this.socketup.bind(this.opts.portup, this.opts.address);
    this.socketup.on('listening', () => { this.emit("ready", (that.socketup.address(), "UP") ); });

    this.socketdown = dgram.createSocket('udp4');
    this.socketdown.bind(this.opts.portdown, this.opts.address);
    this.socketdown.on('listening', () => { this.emit("ready", (that.socketdown.address(), "DOWN") ); });

    this.socketup.on('close', () => { this.emit("close", (this.socketup.address(), "UP") ); });
    this.socketdown.on('close', () => { this.emit("close", (this.socketdown.address(), "DOWN") ); });

    this.socketup.on('error', (err) => {
      this.socketup.close();
      this.socketdown.close();
      this.emit("error", (this.socketup.address(), err, "UP"));
    });

    this.socketdown.on('error', (err) => {
      this.socketup.close();
      this.socketdown.close();
      this.emit("error", (this.socketdown.address(), err, "DOWN"));
    });

    this.socketup.on('message', (socketData, clientInfo) => {
        console.log('server got(RAW) from ', clientInfo);
        this.emit("someemit", clientInfo);
    });

    this.socketdown.on('message', (socketData, clientInfo) => {
        console.log('server got(RAW) from ', clientInfo);
        this.emit("someemit", clientInfo);
    });

  }

};

Server.prototype.pull_resp = function pull_resp(txpk, tokens, clientInfo) {

  var pull_resp_pkg_H = new Buffer(4);

  pull_resp_pkg_H[0] = PROTOCOL_VERSION;
  pull_resp_pkg_H[1] = tokens.h;
  pull_resp_pkg_H[2] = tokens.l;
  pull_resp_pkg_H[3] = PKT_PULL_RESP;

  if (txpk) {
    txpk.imme = txpk.imme || true; //bool, Send packet immediately (will ignore tmst & time)
    //txpk.tmst = txpk.tmst || Date.now() + 100; //number, Send packet on a certain timestamp value (will ignore time)
    //txpk.tmms = txpk.tmms || Date.now() + 100; //number, Send packet at a certain GPS time (GPS synchronization required)

    txpk.freq = txpk.freq || 869.525; //number, TX central frequency in MHz (unsigned float, Hz precision)
    txpk.rfch = txpk.rfch || 0; //number, Concentrator "RF chain" used for TX (unsigned integer)
    txpk.powe = txpk.powe || 14; // number, TX output power in dBm (unsigned integer, dBm precision)
    txpk.modu = txpk.modu || "LORA"; // string, Modulation identifier "LORA" or "FSK"
    txpk.datr = txpk.datr || "SF12BW500"; // string, LoRa datarate identifier (eg. SF12BW500)
    txpk.codr = txpk.codr || "4/5"; // string, LoRa ECC coding rate identifier
    txpk.fdev = txpk.fdev || 3000; // number, FSK frequency deviation (unsigned integer, in Hz)
    txpk.ipol = txpk.ipol || true; // bool, Lora modulation polarization inversion
    txpk.prea = txpk.prea || 0; // number, RF preamble size (unsigned integer)
    txpk.ncrc = txpk.ncrc || false; // bool, If true, disable the CRC of the physical layer (optional)

    txpk.data = txpk.data || ""; // string, Base64 encoded RF packet payload, padding optional

    var dataSize = new Buffer(txpk.data, 'Base64');
    txpk.size = txpk.size || dataSize.length; // number, RF packet payload size in bytes (unsigned integer)
  }

  var message = {
    "protocol":PROTOCOL_VERSION,
    "tokenH":tokens.h,
    "tokenL":tokens.l,
    "type":"PULL_RESP",
    "txpk":{txpk}
  };

  var pull_resp_pkg_B = new Buffer(JSON.stringify({txpk}));
  var pull_resp_pkg = new Buffer.concat([pull_resp_pkg_H, pull_resp_pkg_B]);

  this.socket.send(pull_resp_pkg, 0, pull_resp_pkg.length, clientInfo.port, clientInfo.address, (err) => {
    if (!err) { this.emit("pullresp", message, clientInfo); }
  });

}

function push_ack(that, clientInfo, tokens){

  var push_ack_pkg = new Buffer(4);

  push_ack_pkg[0] = PROTOCOL_VERSION;
  push_ack_pkg[1] = tokens.h;
  push_ack_pkg[2] = tokens.l;
  push_ack_pkg[3] = PKT_PUSH_ACK;

  var message = {
    "protocol":PROTOCOL_VERSION,
    "tokenH":tokens.h,
    "tokenL":tokens.l,
    "type":"PUSH_ACK"
  };

  that.socket.send(push_ack_pkg, 0, push_ack_pkg.length, clientInfo.port, clientInfo.address, (err) => {
    if (!err) { that.emit("pushack", message, clientInfo); }
  });

}

function pull_ack(that, clientInfo, tokens){

  var push_ack_pkg = new Buffer(4);

  push_ack_pkg[0] = PROTOCOL_VERSION;
  push_ack_pkg[1] = tokens.h;
  push_ack_pkg[2] = tokens.l;
  push_ack_pkg[3] = PKT_PULL_ACK;

  var message = {
    "protocol":PROTOCOL_VERSION,
    "tokenH":tokens.h,
    "tokenL":tokens.l,
    "type":"PULL_ACK"
  };

  that.socket.send(push_ack_pkg, 0, push_ack_pkg.length, clientInfo.port, clientInfo.address, (err) => {
    if (!err) { that.emit("pullack", message, clientInfo); }
  });

}

function parseMessage(that, socketData, clientInfo){

  var message = {};

  // Protocol version
  message.protocol = socketData[0];

  // Tokens
  message.tokenH = socketData[1];
  message.tokenL = socketData[2];

  // PF macaddress
  var macaddress = new Buffer(8);
  macaddress[0] = socketData[4];
  macaddress[1] = socketData[5];
  macaddress[2] = socketData[6];
  macaddress[3] = socketData[7];
  macaddress[4] = socketData[8];
  macaddress[5] = socketData[9];
  macaddress[6] = socketData[10];
  macaddress[7] = socketData[11];

  message.gateway = macaddress.toString('hex');

  // Packet direction
  if (socketData[3]==PKT_PUSH_DATA) {
    message.type = "PUSH_DATA";

    var dataString = socketData.toString('utf8', UDP_MSG_PRMBL_OFF, socketData.length);
    if (dataString.length>0){
      message.data = JSON.parse(dataString);
    }

    that.emit("pushdata", message, clientInfo);
  }

  if (socketData[3]==PKT_PULL_DATA) {
    message.type = "PULL_DATA";
    that.emit("pulldata", message, clientInfo);
  }

  if (socketData[3]==PKT_PULL_ACK) {
    message.type = "PULL_ACK";
    that.emit("pullack", message, clientInfo);
  }

  if (socketData[3]==PKT_TX_ACK) {
    message.type = "TX_ACK";

    var dataString = socketData.toString('utf8', UDP_MSG_PRMBL_OFF, socketData.length);
    if (dataString.length>0){
      message.data = JSON.parse(dataString);
    }

    that.emit("txack", message, clientInfo);
  }

}
