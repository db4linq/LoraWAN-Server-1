/*!
 * lorawan-js
 * Copyright(c) 2017 Dmitry Sukhamera
 * MIT Licensed
 */

'use strict';

var CryptoJS = require("crypto-js");

// IV is always zero
var LORA_IV = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');

/**
 * Module dependencies.
 */


 var constants = {
     MTYPE_JOIN_REQUEST: 0,
     MTYPE_JOIN_ACCEPT: 1,
     MTYPE_UNCONFIRMED_DATA_UP: 2,
     MTYPE_UNCONFIRMED_DATA_DOWN: 3,
     MTYPE_CONFIRMED_DATA_UP: 4,
     MTYPE_CONFIRMED_DATA_DOWN: 5,
     MTYPE_RFU: 6,
     MTYPE_PROPRIETARY: 7,

     MTYPE_DESCRIPTIONS: [
         'Join Request',
         'Join Accept',
         'Unconfirmed Data Up',
         'Unconfirmed Data Down',
         'Confirmed Data Up',
         'Confirmed Data Down',
         'RFU',
         'Proprietary'
     ],

     MTYPE_DIRECTIONS: [
         null,
         null,
         'up',
         'down',
         'up',
         'down',
         null,
         null
     ],

     FCTRL_ADR: 0x80,
     FCTRL_ADRACKREQ: 0x40,
     FCTRL_ACK: 0x20,
     FCTRL_FPENDING: 0x10
 };


function Packet(data) {

  if (!(this instanceof Packet)) {
    return new Packet(data);
  }

  this.Buffers = {};
  this.MType = {};

  var _data = this.Buffers;
  var Buffers = new Buffer(data);

  _data.PHYPayload = Buffers;
  _data.MHDR = _data.PHYPayload.slice(0, 1);
  _data.MIC = _data.PHYPayload.slice(_data.PHYPayload.length - 4);

  if (this.isJoinRequestMessage()) {

      _data.AppEUI = BufferReverse(Buffers.slice(1, 9)); //1+8
      _data.DevEUI = BufferReverse(Buffers.slice(9, 17)); //9+8
      _data.DevNonce = BufferReverse(Buffers.slice(17, 2)); //17+2

  } else if (this.isJoinAcceptMessage()) {

      _data.AppNonce = BufferReverse(Buffers.slice(1, 4)); //1 + 3
      _data.NetID = BufferReverse(Buffers.slice(4, 7)); //4 + 3
      _data.DevAddr = BufferReverse(Buffers.slice(7, 11)); //7 + 4
      _data.DLSettings = Buffers.readInt8(11);
      _data.RxDelay = Buffers.readInt8(12);

      if (incoming.length == 33) { //13+16+4
          _data.CFList = Buffers.slice(13, 29); // 13+16
      } else {
          _data.CFList = new Buffer(0);
      }

  } else if (this.isDataMessage()) {


    _data.MACPayload = {};
    _data.MACPayload.FHDR = {};

    var MACPayload = Buffers.slice(1, _data.PHYPayload.length - 4);
    var FCtrl = MACPayload.slice(4, 5);

    var FOptsLen = FCtrl.readInt8(0) & 0x0f;
    var FHDR_length = 7 + FOptsLen;
    var FHDR = MACPayload.slice(0, 0 + FHDR_length);

    _data.MACPayload.FHDR.FCtrl = FCtrl;
    _data.MACPayload.FHDR.FOpts = MACPayload.slice(7, 7 + FOptsLen);
    _data.MACPayload.FHDR.DevAddr = BufferReverse(FHDR.slice(0, 4));
    _data.MACPayload.FHDR.FCnt = BufferReverse(FHDR.slice(5, 7));


    if (FHDR_length == MACPayload.length) {
         _data.MACPayload.FPort = new Buffer(0);
         _data.MACPayload.FRMPayload = new Buffer(0);
     } else {
         _data.MACPayload.FPort = MACPayload.slice(FHDR_length, FHDR_length + 1);
         _data.MACPayload.FRMPayload = MACPayload.slice(FHDR_length + 1);
     }

  }

  this.Buffers = _data;

}

module.exports = Packet;

Packet.prototype = Object.create(null);

Packet.prototype.toString = function() {
  return 'ioberry Lorawan Packet Object';
};

Packet.prototype.getMType = function getMType() {
  return (this.Buffers.MHDR.readUInt8(0) & 0xff) >> 5;
};

Packet.prototype.isDataMessage = function isDataMessage() {
  switch (this.getMType()) {
      case constants.MTYPE_UNCONFIRMED_DATA_UP: this.MType.Description = 'Unconfirmed Data Up';
      case constants.MTYPE_UNCONFIRMED_DATA_DOWN: this.MType.Description = 'Unconfirmed Data Down';
      case constants.MTYPE_CONFIRMED_DATA_UP: this.MType.Description = 'Confirmed Data Up';
      case constants.MTYPE_CONFIRMED_DATA_DOWN: this.MType.Description = 'Confirmed Data Down';

          this.MType.Direction = this.getMessageDirection();
          return true;

      default:
          return false;
  }
};


Packet.prototype.isJoinRequestMessage = function isJoinRequestMessage() {

  if (this.getMType() == constants.MTYPE_JOIN_REQUEST) {
    this.MType.Description = 'Join Request';
    return true;
  } else {
    return false;
  }

};

Packet.prototype.isJoinAcceptMessage = function isJoinAcceptMessage() {

  if (this.getMType() == constants.MTYPE_JOIN_ACCEPT) {
    this.MType.Description = 'Join Accept';
    return true;
  } else {
    return false;
  }


};

Packet.prototype.isRFUMessage = function isRFUMessage() {

  if (this.getMType() == constants.MTYPE_RFU) {
    this.MType.Description = 'RFU';
    return true;
  } else {
    return false;
  }


};

Packet.prototype.isProprietaryMessage = function isProprietaryMessage() {

  if (this.getMType() == constants.MTYPE_PROPRIETARY) {
    this.MType.Description = 'Proprietary';
    return true;
  } else {
    return false;
  }

};

Packet.prototype.getMessageDirection = function getMessageDirection() {

  return constants.MTYPE_DIRECTIONS[this.getMType()];

};

Packet.prototype.getFPort = function getFPort() {

  if (this.Buffers.MACPayload.FPort.length) {
      return this.Buffers.MACPayload.FPort.readUInt8(0);
  } else {
      return null;
  }

};

Packet.prototype.getDevAddr = function getDevAddr() {
  return this.Buffers.MACPayload.FHDR.DevAddr;
};

Packet.prototype.getFCnt = function getFCnt() {
  return this.Buffers.MACPayload.FHDR.FCnt;
};


Packet.prototype.decryptWithKeys = function decryptWithKeys(AppSKey, NwkSKey) {

  var FRMPayload = this.Buffers.MACPayload.FRMPayload;

  if (FRMPayload) {

    var blocks = Math.ceil(FRMPayload.length / 16); // calc number of (16-byte/128-bit) blocks
    var plainBlocks = new Buffer(16 * blocks);

    for (var block = 0; block < blocks; block++) {

      var blockMetadata = Buffer.concat([
        new Buffer([ 1, 0, 0, 0, 0]), // as spec
        this.getMessageDirection() == "up" ? new Buffer([0]) : new Buffer([1]), // direction ('Dir')
        BufferReverse(this.getDevAddr()),
        BufferReverse(this.getFCnt()),
        new Buffer([0,0]), // upper 2 bytes of FCnt (zeroes)
        new Buffer([0]), // 0x00
        new Buffer([block+1]), // block number
      ]);

      blockMetadata.copy(plainBlocks, block * 16);
    }


    var key = this.getFPort() === 0 ? NwkSKey : AppSKey;

    var cipherstream_base64 = CryptoJS.AES.encrypt(
        CryptoJS.enc.Hex.parse(plainBlocks.toString('hex')),
        CryptoJS.enc.Hex.parse(key.toString('hex')), {
            mode: CryptoJS.mode.ECB,
            iv: LORA_IV,
            padding: CryptoJS.pad.NoPadding
        });
    var cipherstream = new Buffer(cipherstream_base64.toString(), 'base64');

    // create buffer for decrypted message
    var plaintextPayload = new Buffer(FRMPayload.length);

    // xor the cipherstream with payload to create plaintext
    for (var i = 0; i < FRMPayload.length; i++) {
        var Si = cipherstream.readUInt8(i);
        plaintextPayload.writeUInt8(Si ^ FRMPayload.readUInt8(i), i);
    }

    return plaintextPayload;
  }



};

/**
 * Private module functions
 */

function BufferReverse (src) {
  var buffer = new Buffer(src.length);

  for (var i = 0, j = src.length - 1; i <= j; ++i, --j) {
    buffer[i] = src[j]
    buffer[j] = src[i]
  }

  return buffer
}
