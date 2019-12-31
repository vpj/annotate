"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = require("./io");
const HTTP = require("http");
const HTTPS = require("https");
const ZLIB = require("zlib");
class NodeHttpPort extends io_1.Port {
    constructor(host, port, path = '/') {
        super();
        this.isStreaming = false;
        this.host = host;
        this.port = port;
        this.path = path;
        this._createHttpOptions();
    }
    _createHttpOptions() {
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
    }
    _onRequest(res) {
        let data = '';
        //LOG 'STATUS: ' + res.statusCode
        //LOG 'HEADERS: ' + JSON.stringify res.headers
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            return data += chunk;
        });
        //LOG 'result', res
        return res.on('end', () => {
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            }
            catch (error) {
                this.onCallError('ParseError', error);
                return;
            }
            return this._handleMessage(jsonData, {
                response: res
            });
        });
    }
    _respond(data, portOptions, callback) {
        let dataStr = JSON.stringify(data);
        let res = portOptions.response;
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
    }
    _send(data, callbacks) {
        let dataStr = JSON.stringify(data);
        let options = this.httpOptions;
        options.headers['content-length'] = Buffer.byteLength(dataStr, 'utf8');
        let req = HTTP.request(options, this._onRequest.bind(this));
        delete options.headers['content-length'];
        req.on('error', (e) => {
            try {
                return typeof callbacks.fail === "function" ? callbacks.fail(e) : void 0;
            }
            catch (error) {
                this.onError(error);
            }
        });
        req.write(dataStr);
        return req.end();
    }
    _handleResponse(packet, portOptions, last) {
        if (!this.shouldAcceptResponse(packet, portOptions)) {
            return;
        }
        if (this.callsCache[packet.id] == null) {
            this.errorCallback(`Response without call: ${packet.id}`, packet);
            return;
        }
        let call = this.callsCache[packet.id];
        if (!call.handle(packet.data, packet)) {
            if (!last) {
                return;
            }
            let params = {
                type: 'poll',
                id: call.id
            };
            return this._send(params, call.callbacks);
        }
    }
}
exports.NodeHttpPort = NodeHttpPort;
;
class NodeHttpServerPort extends io_1.Port {
    constructor(port, allowOrigin, isGZip) {
        super();
        this.isStreaming = false;
        this.port = port;
        this.allowOrigin = allowOrigin;
        this.isGZip = isGZip;
        this.httpOptionsHeader = {
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'origin, content-type',
            'Access-Control-Max-Age': 1728000,
            'Vary': 'Accept-Encoding, Origin',
            'Content-Length': 0,
            'Content-Type': 'text/plain',
            'Allow': 'POST, GET, OPTIONS'
        };
        if (this.allowOrigin != null) {
            this.httpOptionsHeader['Access-Control-Allow-Origin'] = this.allowOrigin;
        }
        if (this.isGZip) {
            this.httpOptionsHeader['Content-Encoding'] = 'gzip';
        }
    }
    _send(data) {
        throw Error();
    }
    _onRequest(req, res) {
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
        let data = '';
        res.setHeader('content-type', 'application/json');
        req.on('data', function (chunk) {
            return data += chunk;
        });
        req.on('end', () => {
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            }
            catch (error) {
                this.errorCallback('ParseError', error);
                return;
            }
            return this._handleMessage(jsonData, {
                response: res,
                request: req
            });
        });
    }
    _respond(data, portOptions, callback) {
        if (this.allowOrigin != null) {
            portOptions.response.setHeader('Access-Control-Allow-Origin', this.allowOrigin);
        }
        let accept = portOptions.request.headers['accept-encoding'];
        if (accept == null) {
            accept = '';
        }
        if (!this.isGZip) {
            accept = '';
        }
        let buffer = Buffer.from(JSON.stringify(data), 'utf8');
        if (accept.match(/\bgzip\b/)) {
            portOptions.response.setHeader('content-encoding', 'gzip');
            ZLIB.gzip(buffer, (err, result) => {
                if (err != null) {
                    return this.errorCallback('GZipeError', err);
                }
                this._sendBuffer(result, portOptions.response, callback);
            });
        }
        else if (accept.match(/\bdeflate\b/)) {
            portOptions.response.setHeader('content-encoding', 'deflate');
            ZLIB.deflate(buffer, (err, result) => {
                if (err != null) {
                    return this.errorCallback('DeflateError', err);
                }
                this._sendBuffer(result, portOptions.response, callback);
            });
        }
        else {
            this._sendBuffer(buffer, portOptions.response, callback);
        }
    }
    _sendBuffer(buf, res, callback) {
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
    }
    listen() {
        this.server = HTTP.createServer(this._onRequest.bind(this));
        return this.server.listen(this.port);
    }
    _handlePoll(data, options) {
        if (!this.shouldPoll(data, options)) {
            return;
        }
        if (this.responses[data.id] == null) {
            this.onHandleError(`Poll without response: ${data.id}`, data, options);
            return;
        }
        return this.responses[data.id].setOptions(options);
    }
}
exports.NodeHttpServerPort = NodeHttpServerPort;
;
// NodeHttpsServerPort class
class NodeHttpsServerPort extends NodeHttpServerPort {
    constructor(port, allowOrigin, isGZip, key, cert) {
        super(port, allowOrigin, isGZip);
        this.key = key;
        this.cert = cert;
    }
    listen() {
        let options = {
            key: this.key,
            cert: this.cert
        };
        this.server = HTTPS.createServer(options, this._onRequest.bind(this));
        return this.server.listen(this.port);
    }
}
exports.NodeHttpsServerPort = NodeHttpsServerPort;
;
