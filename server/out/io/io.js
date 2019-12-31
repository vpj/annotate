"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function LOG(...argArr) {
    console.log.call(console, ...argArr);
}
exports.LOG = LOG;
function ERROR_LOG(...argArr) {
    console.error.call(console, ...argArr);
}
exports.ERROR_LOG = ERROR_LOG;
let POLL_TYPE = {
    progress: true
};
// Response class
class IOResponse {
    constructor(data, port, options) {
        this.id = data.id;
        this.port = port;
        this.options = options;
        this.queue = [];
        this.fresh = true;
    }
    progress(data, callback) {
        this.queue.push({
            status: 'progress',
            data: data,
            callback: callback
        });
        this._handleQueue();
    }
    success(data) {
        this.queue.push({
            status: 'success',
            data: data,
        });
        this._handleQueue();
    }
    fail(data) {
        this.queue.push({
            status: 'fail',
            data: data,
        });
        this._handleQueue();
    }
    setOptions(options) {
        this.options = options;
        this.fresh = true;
        this._handleQueue();
    }
    _multipleResponse() {
        let responseList = [];
        let callbacks = [];
        for (let i = 0; i < this.queue.length; ++i) {
            let d = this.queue[i];
            responseList.push({
                status: d.status,
                data: d.data,
            });
            if (d.callback != null) {
                callbacks.push(d.callback);
            }
        }
        function done() {
            for (let j = 0; j < callbacks.length; ++j) {
                callbacks[j]();
            }
        }
        ;
        if (this.port.isStreaming) {
            this.port.respondMultiple(this, responseList, this.options, done);
        }
        else if (this.fresh) {
            this.port.respondMultiple(this, responseList, this.options, done);
            this.fresh = false;
        }
        this.queue = [];
    }
    _handleQueue() {
        if (!(this.queue.length > 0)) {
            return;
        }
        if (!this.port.isStreaming && !this.fresh) {
            return;
        }
        if (this.queue.length > 1) {
            this._multipleResponse();
            return;
        }
        let d = this.queue[0];
        if (this.port.isStreaming) {
            this.port.respond(this, d.status, d.data, this.options, d.callback);
        }
        else if (this.fresh) {
            this.port.respond(this, d.status, d.data, this.options, d.callback);
            this.fresh = false;
        }
        this.queue = [];
    }
}
exports.IOResponse = IOResponse;
;
// Call class
class Call {
    constructor(id, method, data, callbacks, port) {
        this.id = id;
        this.method = method;
        this.data = data;
        this.callbacks = callbacks;
        this.port = port;
        null;
    }
    handle(data, packet) {
        if (this.callbacks[packet.status] == null) {
            if (packet.status === 'progress') {
                return;
            }
            //Handled by caller
            throw new Error(`No callback registered ${this.method} ${packet.status}`);
        }
        let self = this;
        setTimeout(function () {
            try {
                return self.callbacks[packet.status](data, packet);
            }
            catch (error) {
                self.port.onError(error);
            }
        }, 0);
        return POLL_TYPE[packet.status] == null;
    }
}
;
class Port {
    constructor() {
        this.isStreaming = true;
        this.handlers = {};
        this.callsCache = {};
        this.callsCounter = 0;
        this.id = Math.floor(Math.random() * 1000);
        this.responses = {};
    }
    onError(err) {
        LOG(err);
    }
    onCallError(msg, options = null) {
        let callsCache = this.callsCache;
        this.callsCache = {};
        for (let id in callsCache) {
            let call = callsCache[id];
            if (call.callbacks.fail == null) {
                ERROR_LOG('fail callback not registered', call.method, call.data);
            }
            else {
                call.callbacks.fail({
                    error: 'connectionError',
                    msg: msg,
                    options: options
                });
            }
        }
        return this.errorCallback(msg, options);
    }
    onHandleError(msg, data, options) {
        this.errorCallback(msg, data);
        let response = new IOResponse(data, this, options);
        return response.fail(msg);
    }
    errorCallback(msg, options) {
        return ERROR_LOG(msg, options);
    }
    send(method, data, f) {
        let callbacks;
        if ((typeof f) === 'function') {
            callbacks = {
                success: f
            };
        }
        else {
            callbacks = f;
        }
        this.sendTyped(method, data, callbacks);
    }
    sendTyped(method, data, callbacks) {
        if (!this.shouldSend(method, data, callbacks)) {
            return;
        }
        let params = this._createCall(method, data, callbacks);
        this._send(params, callbacks);
    }
    shouldSend(method, data, callbacks) {
        return true;
    }
    // Respond to a RPC call
    respond(response, status, data, portOptions, callback) {
        if (POLL_TYPE[status] == null) {
            delete this.responses[response.id];
        }
        if (!this.shouldRespond(response, status, data, portOptions)) {
            return;
        }
        this._respond(this._createResponse(response, status, data), portOptions, callback);
    }
    shouldRespond(response, status, data, portOptions) {
        return true;
    }
    respondMultiple(response, list, portOptions, callback) {
        for (let d of list) {
            if (POLL_TYPE[d.status] == null) {
                delete this.responses[response.id];
                break;
            }
        }
        let data = [];
        for (let d of list) {
            if (!this.shouldRespond(response, d.status, d.data, portOptions)) {
                continue;
            }
            data.push(this._createResponse(response, d.status, d.data));
        }
        if (data.length === 0) {
            return;
        }
        this._respond({
            type: 'list',
            list: data
        }, portOptions, callback);
    }
    // Create Call object
    _createCall(method, data, callbacks) {
        let call = new Call(`${this.id}-${this.callsCounter}`, method, data, callbacks, this);
        this.callsCounter++;
        this.callsCache[call.id] = call;
        let params = {
            type: 'call',
            id: call.id,
            method: call.method,
            data: call.data
        };
        return params;
    }
    // Create Response object
    _createResponse(response, status, data) {
        let params = {
            type: 'response',
            id: response.id,
            status: status,
            data: data
        };
        return params;
    }
    // Add handler
    on(method, callback) {
        return this.handlers[method] = callback;
    }
    // Handle incoming message
    _handleMessage(packet, options = {}, last = true) {
        switch (packet.type) {
            case 'list':
                packet = packet;
                for (let i = 0; i < packet.list.length; ++i) {
                    this._handleMessage(packet.list[i], options, last && i + 1 === packet.list.length);
                }
                break;
            case 'response':
                try {
                    this._handleResponse(packet, options, last);
                }
                catch (error) {
                    this.onError(error);
                }
                break;
            case 'call':
                try {
                    this._handleCall(packet, options, last);
                }
                catch (error) {
                    this.onError(error);
                }
                break;
            case 'poll':
                try {
                    this._handlePoll(packet, options, last);
                }
                catch (error) {
                    this.onError(error);
                }
        }
    }
    _handleCall(packet, options, last) {
        if (!this.shouldCall(packet, options)) {
            return;
        }
        if (this.handlers[packet.method] == null) {
            this.onHandleError(`Unknown method: ${packet.method}`, packet, options);
            return;
        }
        this.responses[packet.id] = new IOResponse(packet, this, options);
        this.handlers[packet.method](packet.data, packet, this.responses[packet.id]);
    }
    shouldCall(packet, options) {
        return true;
    }
    shouldPoll(packet, options) {
        return true;
    }
    _handleResponse(data, options, last) {
        if (!this.shouldAcceptResponse(data, options)) {
            return;
        }
        if (this.callsCache[data.id] == null) {
            //Cannot reply
            this.errorCallback(`Response without call: ${data.id}`, data);
            return;
        }
        try {
            if (this.callsCache[data.id].handle(data.data, data)) {
                delete this.callsCache[data.id];
            }
        }
        catch (error) {
            this.errorCallback(error.message, data);
            delete this.callsCache[data.id];
        }
    }
    shouldAcceptResponse(packet, options) {
        return true;
    }
    _handlePoll(data, options, last) {
        return this.onHandleError("Poll not implemented", data, options);
    }
}
exports.Port = Port;
;
