"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = require("./io");
class FramePort extends io_1.Port {
    constructor(source, dest) {
        super();
        this.source = source;
        this.dest = dest;
        this.source.addEventListener('message', this._onMessage.bind(this));
    }
    _send(data) {
        return this.dest.postMessage(data, '*');
    }
    _respond(data, portOptions, callback) {
        this.dest.postMessage(data, '*');
        return typeof callback === "function" ? callback() : void 0;
    }
    _onMessage(e) {
        return this._handleMessage(e.data);
    }
}
exports.FramePort = FramePort;
;
