var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function LOG() {
        var _a;
        var argArr = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argArr[_i] = arguments[_i];
        }
        (_a = console.log).call.apply(_a, __spreadArrays([console], argArr));
    }
    exports.LOG = LOG;
    function ERROR_LOG() {
        var _a;
        var argArr = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argArr[_i] = arguments[_i];
        }
        (_a = console.error).call.apply(_a, __spreadArrays([console], argArr));
    }
    exports.ERROR_LOG = ERROR_LOG;
    var POLL_TYPE = {
        progress: true
    };
    // Response class
    var IOResponse = /** @class */ (function () {
        function IOResponse(data, port, options) {
            this.id = data.id;
            this.port = port;
            this.options = options;
            this.queue = [];
            this.fresh = true;
        }
        IOResponse.prototype.progress = function (data, callback) {
            this.queue.push({
                status: 'progress',
                data: data,
                callback: callback
            });
            this._handleQueue();
        };
        IOResponse.prototype.success = function (data) {
            this.queue.push({
                status: 'success',
                data: data,
            });
            this._handleQueue();
        };
        IOResponse.prototype.fail = function (data) {
            this.queue.push({
                status: 'fail',
                data: data,
            });
            this._handleQueue();
        };
        IOResponse.prototype.setOptions = function (options) {
            this.options = options;
            this.fresh = true;
            this._handleQueue();
        };
        IOResponse.prototype._multipleResponse = function () {
            var responseList = [];
            var callbacks = [];
            for (var i = 0; i < this.queue.length; ++i) {
                var d = this.queue[i];
                responseList.push({
                    status: d.status,
                    data: d.data,
                });
                if (d.callback != null) {
                    callbacks.push(d.callback);
                }
            }
            function done() {
                for (var j = 0; j < callbacks.length; ++j) {
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
        };
        IOResponse.prototype._handleQueue = function () {
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
            var d = this.queue[0];
            if (this.port.isStreaming) {
                this.port.respond(this, d.status, d.data, this.options, d.callback);
            }
            else if (this.fresh) {
                this.port.respond(this, d.status, d.data, this.options, d.callback);
                this.fresh = false;
            }
            this.queue = [];
        };
        return IOResponse;
    }());
    exports.IOResponse = IOResponse;
    ;
    // Call class
    var Call = /** @class */ (function () {
        function Call(id, method, data, callbacks, port) {
            this.id = id;
            this.method = method;
            this.data = data;
            this.callbacks = callbacks;
            this.port = port;
            null;
        }
        Call.prototype.handle = function (data, packet) {
            if (this.callbacks[packet.status] == null) {
                if (packet.status === 'progress') {
                    return;
                }
                //Handled by caller
                throw new Error("No callback registered " + this.method + " " + packet.status);
            }
            var self = this;
            setTimeout(function () {
                try {
                    return self.callbacks[packet.status](data, packet);
                }
                catch (error) {
                    self.port.onError(error);
                }
            }, 0);
            return POLL_TYPE[packet.status] == null;
        };
        return Call;
    }());
    ;
    var Port = /** @class */ (function () {
        function Port() {
            this.isStreaming = true;
            this.handlers = {};
            this.callsCache = {};
            this.callsCounter = 0;
            this.id = Math.floor(Math.random() * 1000);
            this.responses = {};
        }
        Port.prototype.onError = function (err) {
            LOG(err);
        };
        Port.prototype.onCallError = function (msg, options) {
            if (options === void 0) { options = null; }
            var callsCache = this.callsCache;
            this.callsCache = {};
            for (var id in callsCache) {
                var call = callsCache[id];
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
        };
        Port.prototype.onHandleError = function (msg, data, options) {
            this.errorCallback(msg, data);
            var response = new IOResponse(data, this, options);
            return response.fail(msg);
        };
        Port.prototype.errorCallback = function (msg, options) {
            return ERROR_LOG(msg, options);
        };
        Port.prototype.send = function (method, data, f) {
            var callbacks;
            if ((typeof f) === 'function') {
                callbacks = {
                    success: f
                };
            }
            else {
                callbacks = f;
            }
            this.sendTyped(method, data, callbacks);
        };
        Port.prototype.sendTyped = function (method, data, callbacks) {
            if (!this.shouldSend(method, data, callbacks)) {
                return;
            }
            var params = this._createCall(method, data, callbacks);
            this._send(params, callbacks);
        };
        Port.prototype.shouldSend = function (method, data, callbacks) {
            return true;
        };
        // Respond to a RPC call
        Port.prototype.respond = function (response, status, data, portOptions, callback) {
            if (POLL_TYPE[status] == null) {
                delete this.responses[response.id];
            }
            if (!this.shouldRespond(response, status, data, portOptions)) {
                return;
            }
            this._respond(this._createResponse(response, status, data), portOptions, callback);
        };
        Port.prototype.shouldRespond = function (response, status, data, portOptions) {
            return true;
        };
        Port.prototype.respondMultiple = function (response, list, portOptions, callback) {
            for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
                var d = list_1[_i];
                if (POLL_TYPE[d.status] == null) {
                    delete this.responses[response.id];
                    break;
                }
            }
            var data = [];
            for (var _a = 0, list_2 = list; _a < list_2.length; _a++) {
                var d = list_2[_a];
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
        };
        // Create Call object
        Port.prototype._createCall = function (method, data, callbacks) {
            var call = new Call(this.id + "-" + this.callsCounter, method, data, callbacks, this);
            this.callsCounter++;
            this.callsCache[call.id] = call;
            var params = {
                type: 'call',
                id: call.id,
                method: call.method,
                data: call.data
            };
            return params;
        };
        // Create Response object
        Port.prototype._createResponse = function (response, status, data) {
            var params = {
                type: 'response',
                id: response.id,
                status: status,
                data: data
            };
            return params;
        };
        // Add handler
        Port.prototype.on = function (method, callback) {
            return this.handlers[method] = callback;
        };
        // Handle incoming message
        Port.prototype._handleMessage = function (packet, options, last) {
            if (options === void 0) { options = {}; }
            if (last === void 0) { last = true; }
            switch (packet.type) {
                case 'list':
                    packet = packet;
                    for (var i = 0; i < packet.list.length; ++i) {
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
        };
        Port.prototype._handleCall = function (packet, options, last) {
            if (!this.shouldCall(packet, options)) {
                return;
            }
            if (this.handlers[packet.method] == null) {
                this.onHandleError("Unknown method: " + packet.method, packet, options);
                return;
            }
            this.responses[packet.id] = new IOResponse(packet, this, options);
            this.handlers[packet.method](packet.data, packet, this.responses[packet.id]);
        };
        Port.prototype.shouldCall = function (packet, options) {
            return true;
        };
        Port.prototype.shouldPoll = function (packet, options) {
            return true;
        };
        Port.prototype._handleResponse = function (data, options, last) {
            if (!this.shouldAcceptResponse(data, options)) {
                return;
            }
            if (this.callsCache[data.id] == null) {
                //Cannot reply
                this.errorCallback("Response without call: " + data.id, data);
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
        };
        Port.prototype.shouldAcceptResponse = function (packet, options) {
            return true;
        };
        Port.prototype._handlePoll = function (data, options, last) {
            return this.onHandleError("Poll not implemented", data, options);
        };
        return Port;
    }());
    exports.Port = Port;
    ;
});
