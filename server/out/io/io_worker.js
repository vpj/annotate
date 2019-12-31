"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = require("./io");
class WorkerPort extends io_1.Port {
    constructor(worker) {
        super();
        this.worker = worker;
        this.worker.onmessage = this._onMessage.bind(this);
    }
    //@worker.onerror = @onCallError.bind this
    _send(data) {
        let dd = data.data;
        let transferList;
        if ((dd != null) && (dd._transferList != null)) {
            transferList = dd._transferList;
            delete dd._transferList;
        }
        else {
            transferList = [];
        }
        return this.worker.postMessage(data, transferList);
    }
    _respond(data, portOptions, callback) {
        let dd = data.data;
        let transferList;
        if ((dd != null) && (dd._transferList != null)) {
            transferList = dd._transferList;
            delete dd._transferList;
        }
        else {
            transferList = [];
        }
        this.worker.postMessage(data, transferList);
        if (typeof callback === "function")
            callback();
    }
    _onMessage(e) {
        return this._handleMessage(e.data);
    }
}
exports.WorkerPort = WorkerPort;
;
