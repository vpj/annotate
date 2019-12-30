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
    var FramePort = /** @class */ (function (_super) {
        __extends(FramePort, _super);
        function FramePort(source, dest) {
            var _this = _super.call(this) || this;
            _this.source = source;
            _this.dest = dest;
            _this.source.addEventListener('message', _this._onMessage.bind(_this));
            return _this;
        }
        FramePort.prototype._send = function (data) {
            return this.dest.postMessage(data, '*');
        };
        FramePort.prototype._respond = function (data, portOptions, callback) {
            this.dest.postMessage(data, '*');
            return typeof callback === "function" ? callback() : void 0;
        };
        FramePort.prototype._onMessage = function (e) {
            return this._handleMessage(e.data);
        };
        return FramePort;
    }(io_1.Port));
    exports.FramePort = FramePort;
    ;
});
