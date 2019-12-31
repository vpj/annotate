"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = require("./io");
// AJAX class
class AjaxHttpPort extends io_1.Port {
    constructor(protocol, host, port, path) {
        super();
        this.isStreaming = false;
        this.protocol = protocol;
        this.host = host;
        this.port = port;
        this.path = path;
        this.url = this.path;
        if (this.protocol != null) {
            if ((this.host != null) && (this.port == null)) {
                this.url = `${this.protocol}://${this.host}${this.path}`;
            }
            else if ((this.host != null) && (this.port != null)) {
                this.url = `${this.protocol}://${this.host}:${this.port}${this.path}`;
            }
        }
        else {
            if ((this.host != null) && (this.port == null)) {
                this.url = `//${this.host}${this.path}`;
            }
            else if ((this.host != null) && (this.port != null)) {
                this.url = `//${this.host}:${this.port}${this.path}`;
            }
        }
    }
    _onRequest(xhr) {
        let jsonData;
        if (xhr.readyState !== 4) {
            return;
        }
        let status = xhr.status;
        if ((!status && xhr.responseText != null && xhr.responseText !== '') ||
            (status >= 200 && status < 300) ||
            (status === 304)) {
            try {
                jsonData = JSON.parse(xhr.responseText);
            }
            catch (error) {
                this.onCallError('ParseError', error);
                return;
            }
            return this._handleMessage(jsonData, {
                xhr: xhr
            });
        }
        else {
            return this.onCallError('Cannot connect to server');
        }
    }
    _respond(data, portOptions, callback) {
        this.errorCallback('AJAX cannot respond', data);
        return typeof callback === "function" ? callback() : void 0;
    }
    _send(data) {
        let dataStr = JSON.stringify(data);
        let xhr = new XMLHttpRequest;
        xhr.open('POST', this.url);
        xhr.onreadystatechange = () => {
            return this._onRequest(xhr);
        };
        xhr.setRequestHeader('Accept', 'application/json');
        //xhr.setRequestHeader 'Content-Type', 'application/json'
        return xhr.send(dataStr);
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
        try {
            if (call.handle(packet.data, packet)) {
                delete this.callsCache[packet.id];
            }
            else if (last) {
                let params = {
                    type: 'poll',
                    id: call.id
                };
                this._send(params);
            }
        }
        catch (error) {
            this.errorCallback(error.message, packet);
            delete this.callsCache[packet.id];
        }
    }
}
exports.AjaxHttpPort = AjaxHttpPort;
;
