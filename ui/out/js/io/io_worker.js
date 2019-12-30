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
    var WorkerPort = /** @class */ (function (_super) {
        __extends(WorkerPort, _super);
        function WorkerPort(worker) {
            var _this = _super.call(this) || this;
            _this.worker = worker;
            _this.worker.onmessage = _this._onMessage.bind(_this);
            return _this;
        }
        //@worker.onerror = @onCallError.bind this
        WorkerPort.prototype._send = function (data) {
            var dd = data.data;
            var transferList;
            if ((dd != null) && (dd._transferList != null)) {
                transferList = dd._transferList;
                delete dd._transferList;
            }
            else {
                transferList = [];
            }
            return this.worker.postMessage(data, transferList);
        };
        WorkerPort.prototype._respond = function (data, portOptions, callback) {
            var dd = data.data;
            var transferList;
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
        };
        WorkerPort.prototype._onMessage = function (e) {
            return this._handleMessage(e.data);
        };
        return WorkerPort;
    }(io_1.Port));
    exports.WorkerPort = WorkerPort;
    ;
});
