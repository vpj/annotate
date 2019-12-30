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
    var WebSocketPort = /** @class */ (function (_super) {
        __extends(WebSocketPort, _super);
        function WebSocketPort(socket) {
            var _this = _super.call(this) || this;
            _this.socket = socket;
            _this.socket.onmessage(_this._onMessage.bind(_this));
            return _this;
        }
        WebSocketPort.prototype._send = function (data) {
            return this.socket.send(JSON.stringify(data));
        };
        WebSocketPort.prototype._respond = function (data, portOptions, callback) {
            this.socket.send(JSON.stringify(data));
            return typeof callback === "function" ? callback() : void 0;
        };
        WebSocketPort.prototype._onMessage = function (e) {
            return this._handleMessage(e.data);
        };
        return WebSocketPort;
    }(io_1.Port));
    exports.WebSocketPort = WebSocketPort;
    ;
    var ServerSocketPort = /** @class */ (function (_super) {
        __extends(ServerSocketPort, _super);
        function ServerSocketPort(socket) {
            var _this = _super.call(this) || this;
            _this.socket = socket;
            _this.socket.onopen(_this._onConnection.bind(_this));
            return _this;
        }
        ServerSocketPort.prototype._send = function (data) {
            throw Error();
        };
        ServerSocketPort.prototype._respond = function (data, portOptions, callback) {
            throw Error();
        };
        ServerSocketPort.prototype._onConnection = function (socket) {
            return new WebSocketPort(socket);
        };
        return ServerSocketPort;
    }(io_1.Port));
    exports.ServerSocketPort = ServerSocketPort;
    ;
});
