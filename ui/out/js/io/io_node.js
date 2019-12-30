var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "./io", "http", "https", "zlib"], function (require, exports, io_1, HTTP, HTTPS, ZLIB) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NodeHttpPort = /** @class */ (function (_super) {
        __extends(NodeHttpPort, _super);
        function NodeHttpPort(host, port, path) {
            if (path === void 0) { path = '/'; }
            var _this = _super.call(this) || this;
            _this.isStreaming = false;
            _this.host = host;
            _this.port = port;
            _this.path = path;
            _this._createHttpOptions();
            return _this;
        }
        NodeHttpPort.prototype._createHttpOptions = function () {
            return this.httpOptions = {
                hostname: this.host,
                port: this.port,
                path: this.path,
                method: 'POST',
                agent: false,
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json'
                },
            };
        };
        NodeHttpPort.prototype._onRequest = function (res) {
            var _this = this;
            var data = '';
            //LOG 'STATUS: ' + res.statusCode
            //LOG 'HEADERS: ' + JSON.stringify res.headers
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                return data += chunk;
            });
            //LOG 'result', res
            return res.on('end', function () {
                var jsonData;
                try {
                    jsonData = JSON.parse(data);
                }
                catch (error) {
                    _this.onCallError('ParseError', error);
                    return;
                }
                return _this._handleMessage(jsonData, {
                    response: res
                });
            });
        };
        NodeHttpPort.prototype._respond = function (data, portOptions, callback) {
            var dataStr = JSON.stringify(data);
            var res = portOptions.response;
            res.setHeader('content-length', Buffer.byteLength(dataStr, 'utf8'));
            if (callback != null) {
                res.once('finish', function () {
                    return callback();
                });
                res.once('close', function () {
                    return callback();
                });
            }
            res.write(dataStr);
            return res.end();
        };
        NodeHttpPort.prototype._send = function (data, callbacks) {
            var _this = this;
            var dataStr = JSON.stringify(data);
            var options = this.httpOptions;
            options.headers['content-length'] = Buffer.byteLength(dataStr, 'utf8');
            var req = HTTP.request(options, this._onRequest.bind(this));
            delete options.headers['content-length'];
            req.on('error', function (e) {
                try {
                    return typeof callbacks.fail === "function" ? callbacks.fail(e) : void 0;
                }
                catch (error) {
                    _this.onError(error);
                }
            });
            req.write(dataStr);
            return req.end();
        };
        NodeHttpPort.prototype._handleResponse = function (packet, portOptions, last) {
            if (!this.shouldAcceptResponse(packet, portOptions)) {
                return;
            }
            if (this.callsCache[packet.id] == null) {
                this.errorCallback("Response without call: " + packet.id, packet);
                return;
            }
            var call = this.callsCache[packet.id];
            if (!call.handle(packet.data, packet)) {
                if (!last) {
                    return;
                }
                var params = {
                    type: 'poll',
                    id: call.id
                };
                return this._send(params, call.callbacks);
            }
        };
        return NodeHttpPort;
    }(io_1.Port));
    exports.NodeHttpPort = NodeHttpPort;
    ;
    var NodeHttpServerPort = /** @class */ (function (_super) {
        __extends(NodeHttpServerPort, _super);
        function NodeHttpServerPort(port, allowOrigin, isGZip) {
            var _this = _super.call(this) || this;
            _this.isStreaming = false;
            _this.port = port;
            _this.allowOrigin = allowOrigin;
            _this.isGZip = isGZip;
            _this.httpOptionsHeader = {
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'origin, content-type',
                'Access-Control-Max-Age': 1728000,
                'Vary': 'Accept-Encoding, Origin',
                'Content-Length': 0,
                'Content-Type': 'text/plain',
                'Allow': 'POST, GET, OPTIONS'
            };
            if (_this.allowOrigin != null) {
                _this.httpOptionsHeader['Access-Control-Allow-Origin'] = _this.allowOrigin;
            }
            if (_this.isGZip) {
                _this.httpOptionsHeader['Content-Encoding'] = 'gzip';
            }
            return _this;
        }
        NodeHttpServerPort.prototype._send = function (data) {
            throw Error();
        };
        NodeHttpServerPort.prototype._onRequest = function (req, res) {
            var _this = this;
            if (req.method.toUpperCase() === 'OPTIONS') {
                res.writeHead(200, this.httpOptionsHeader);
                res.end();
                return;
            }
            if (this.handleRequest != null) {
                if (this.handleRequest(req, res)) {
                    return;
                }
            }
            var data = '';
            res.setHeader('content-type', 'application/json');
            req.on('data', function (chunk) {
                return data += chunk;
            });
            req.on('end', function () {
                var jsonData;
                try {
                    jsonData = JSON.parse(data);
                }
                catch (error) {
                    _this.errorCallback('ParseError', error);
                    return;
                }
                return _this._handleMessage(jsonData, {
                    response: res,
                    request: req
                });
            });
        };
        NodeHttpServerPort.prototype._respond = function (data, portOptions, callback) {
            var _this = this;
            if (this.allowOrigin != null) {
                portOptions.response.setHeader('Access-Control-Allow-Origin', this.allowOrigin);
            }
            var accept = portOptions.request.headers['accept-encoding'];
            if (accept == null) {
                accept = '';
            }
            if (!this.isGZip) {
                accept = '';
            }
            var buffer = Buffer.from(JSON.stringify(data), 'utf8');
            if (accept.match(/\bgzip\b/)) {
                portOptions.response.setHeader('content-encoding', 'gzip');
                ZLIB.gzip(buffer, function (err, result) {
                    if (err != null) {
                        return _this.errorCallback('GZipeError', err);
                    }
                    _this._sendBuffer(result, portOptions.response, callback);
                });
            }
            else if (accept.match(/\bdeflate\b/)) {
                portOptions.response.setHeader('content-encoding', 'deflate');
                ZLIB.deflate(buffer, function (err, result) {
                    if (err != null) {
                        return _this.errorCallback('DeflateError', err);
                    }
                    _this._sendBuffer(result, portOptions.response, callback);
                });
            }
            else {
                this._sendBuffer(buffer, portOptions.response, callback);
            }
        };
        NodeHttpServerPort.prototype._sendBuffer = function (buf, res, callback) {
            res.setHeader('content-length', buf.length);
            if (callback != null) {
                res.once('finish', function () {
                    callback();
                });
                res.once('close', function () {
                    callback();
                });
            }
            res.write(buf);
            return res.end();
        };
        NodeHttpServerPort.prototype.listen = function () {
            this.server = HTTP.createServer(this._onRequest.bind(this));
            return this.server.listen(this.port);
        };
        NodeHttpServerPort.prototype._handlePoll = function (data, options) {
            if (!this.shouldPoll(data, options)) {
                return;
            }
            if (this.responses[data.id] == null) {
                this.onHandleError("Poll without response: " + data.id, data, options);
                return;
            }
            return this.responses[data.id].setOptions(options);
        };
        return NodeHttpServerPort;
    }(io_1.Port));
    exports.NodeHttpServerPort = NodeHttpServerPort;
    ;
    // NodeHttpsServerPort class
    var NodeHttpsServerPort = /** @class */ (function (_super) {
        __extends(NodeHttpsServerPort, _super);
        function NodeHttpsServerPort(port, allowOrigin, isGZip, key, cert) {
            var _this = _super.call(this, port, allowOrigin, isGZip) || this;
            _this.key = key;
            _this.cert = cert;
            return _this;
        }
        NodeHttpsServerPort.prototype.listen = function () {
            var options = {
                key: this.key,
                cert: this.cert
            };
            this.server = HTTPS.createServer(options, this._onRequest.bind(this));
            return this.server.listen(this.port);
        };
        return NodeHttpsServerPort;
    }(NodeHttpServerPort));
    exports.NodeHttpsServerPort = NodeHttpsServerPort;
    ;
});
