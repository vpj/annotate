"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = require("./io");
class WebSocketPort extends io_1.Port {
    constructor(socket) {
        super();
        this.socket = socket;
        this.socket.onmessage(this._onMessage.bind(this));
    }
    _send(data) {
        return this.socket.send(JSON.stringify(data));
    }
    _respond(data, portOptions, callback) {
        this.socket.send(JSON.stringify(data));
        return typeof callback === "function" ? callback() : void 0;
    }
    _onMessage(e) {
        return this._handleMessage(e.data);
    }
}
exports.WebSocketPort = WebSocketPort;
;
class ServerSocketPort extends io_1.Port {
    constructor(socket) {
        super();
        this.socket = socket;
        this.socket.onopen(this._onConnection.bind(this));
    }
    _send(data) {
        throw Error();
    }
    _respond(data, portOptions, callback) {
        throw Error();
    }
    _onConnection(socket) {
        return new WebSocketPort(socket);
    }
}
exports.ServerSocketPort = ServerSocketPort;
;
