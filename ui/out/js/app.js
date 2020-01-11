define(["require", "exports", "./weya/router", "./io/ajax"], function (require, exports, router_1, ajax_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ROUTER = new router_1.Router({
        emulateState: false,
        hashChange: true,
        pushState: false,
        root: '',
        onerror: function (e) { console.error("Error", e); }
    });
    exports.PORT = new ajax_1.AjaxHttpPort("http", "localhost", 8088, '/api');
});
