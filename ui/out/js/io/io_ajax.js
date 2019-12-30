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
define(["require", "exports", "./io"], function (require, exports, io_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // AJAX class
    var AjaxHttpPort = /** @class */ (function (_super) {
        __extends(AjaxHttpPort, _super);
        function AjaxHttpPort(protocol, host, port, path) {
            var _this = _super.call(this) || this;
            _this.isStreaming = false;
            _this.protocol = protocol;
            _this.host = host;
            _this.port = port;
            _this.path = path;
            _this.url = _this.path;
            if (_this.protocol != null) {
                if ((_this.host != null) && (_this.port == null)) {
                    _this.url = _this.protocol + "://" + _this.host + _this.path;
                }
                else if ((_this.host != null) && (_this.port != null)) {
                    _this.url = _this.protocol + "://" + _this.host + ":" + _this.port + _this.path;
                }
            }
            else {
                if ((_this.host != null) && (_this.port == null)) {
                    _this.url = "//" + _this.host + _this.path;
                }
                else if ((_this.host != null) && (_this.port != null)) {
                    _this.url = "//" + _this.host + ":" + _this.port + _this.path;
                }
            }
            return _this;
        }
        AjaxHttpPort.prototype._onRequest = function (xhr) {
            var jsonData;
            if (xhr.readyState !== 4) {
                return;
            }
            var status = xhr.status;
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
        };
        AjaxHttpPort.prototype._respond = function (data, portOptions, callback) {
            this.errorCallback('AJAX cannot respond', data);
            return typeof callback === "function" ? callback() : void 0;
        };
        AjaxHttpPort.prototype._send = function (data) {
            var _this = this;
            var dataStr = JSON.stringify(data);
            var xhr = new XMLHttpRequest;
            xhr.open('POST', this.url);
            xhr.onreadystatechange = function () {
                return _this._onRequest(xhr);
            };
            xhr.setRequestHeader('Accept', 'application/json');
            //xhr.setRequestHeader 'Content-Type', 'application/json'
            return xhr.send(dataStr);
        };
        AjaxHttpPort.prototype._handleResponse = function (packet, portOptions, last) {
            if (!this.shouldAcceptResponse(packet, portOptions)) {
                return;
            }
            if (this.callsCache[packet.id] == null) {
                this.errorCallback("Response without call: " + packet.id, packet);
                return;
            }
            var call = this.callsCache[packet.id];
            try {
                if (call.handle(packet.data, packet)) {
                    delete this.callsCache[packet.id];
                }
                else if (last) {
                    var params = {
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
        };
        return AjaxHttpPort;
    }(io_1.Port));
    exports.AjaxHttpPort = AjaxHttpPort;
    ;
});
