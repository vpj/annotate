define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Router = /** @class */ (function () {
        function Router(options) {
            this.optionalParam = /\((.*?)\)/g;
            this.namedParam = /(\(\?)?:\w+/g;
            this.splatParam = /\*\w+/g;
            this.escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
            this.event = null;
            this.history = [];
            this.controller = new Controller(options);
        }
        Router.prototype.start = function (startState, silent) {
            var fragment = this.controller.getFragment();
            this.controller.start(startState, silent);
            if (silent === true) {
                this.history.push({
                    fragment: fragment,
                    title: document.title
                });
            }
        };
        Router.prototype.back = function () {
            if (this.history.length > 1) {
                return this.controller.back();
            }
        };
        Router.prototype.canBack = function () {
            if (this.history.length > 1 && this.controller.canBack()) {
                return true;
            }
            else {
                return false;
            }
        };
        Router.prototype.route = function (route, callbacks) {
            var _this = this;
            if ((Object.prototype.toString.call(route)) !== '[object RegExp]') {
                route = this._routeToRegExp(route);
            }
            this.controller.route(route, function (fragment, event) {
                var args = _this._extractParameters(route, fragment);
                _this.event = event;
                if (_this.event != null && _this.event.type === "popstate") {
                    _this.history.pop();
                    if (_this.history.length === 0) {
                        _this.history.push({
                            fragment: fragment,
                            title: document.title,
                            state: _this.getState()
                        });
                    }
                }
                else {
                    _this.history.push({
                        fragment: fragment,
                        title: document.title,
                        state: _this.getState()
                    });
                }
                for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
                    var callback = callbacks_1[_i];
                    if (!callback.apply(_this, args)) {
                        break;
                    }
                }
            });
        };
        Router.prototype.getState = function () {
            if (this.event == null)
                return null;
            else if (this.event.originalEvent == null)
                return null;
            else
                return this.event.originalEvent;
        };
        Router.prototype.navigate = function (fragment, options) {
            var def = { replace: false, trigger: true, title: '', state: null };
            if (!options) {
                options = def;
            }
            for (var k in def) {
                if (!(k in options)) {
                    options[k] = def[k];
                }
            }
            if (options.replace) {
                this.history.pop();
            }
            if (!options.trigger) {
                this.history.push({
                    fragment: fragment,
                    title: options.title,
                    state: options.state
                });
            }
            return this.controller.navigate(fragment, options);
        };
        Router.prototype._routeToRegExp = function (route) {
            route = route
                .replace(this.escapeRegExp, '\\$&')
                .replace(this.optionalParam, '(?:$1)?')
                .replace(this.namedParam, function (match, optional) {
                if (optional) {
                    return match;
                }
                else {
                    return '([^\/]+)';
                }
            }).replace(this.splatParam, '(.*?)');
            return new RegExp("^" + route + "$");
        };
        Router.prototype._extractParameters = function (route, fragment) {
            var params = route.exec(fragment).slice(1);
            var results = [];
            for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
                var p = params_1[_i];
                if (p != null)
                    results.push(decodeURIComponent(p));
            }
            return results;
        };
        Router.prototype.getParams = function (search) {
            var vars = search.substr(1)
                .split('&');
            var params = {};
            for (var _i = 0, vars_1 = vars; _i < vars_1.length; _i++) {
                var v = vars_1[_i];
                var pair = v.split('=');
                params[pair[0]] = decodeURIComponent(pair[1]);
            }
            return params;
        };
        return Router;
    }());
    exports.Router = Router;
    var Controller = /** @class */ (function () {
        function Controller(options) {
            this.routeStripper = /^[#\/]|\s+$/g;
            this.rootStripper = /^\/+|\/+$/g;
            this.trailingSlash = /\/$/;
            this.pathStripper = /[?#].*$/;
            this.interval = 50;
            this.handlers = [];
            this.checkUrl = this.checkUrl.bind(this);
            this.history = window.history;
            this.location = window.location;
            this.stateList = [];
            this.started = false;
            this.emulateState = options.emulateState || false;
            this.wantsHashChange = this.emulateState === false && options.hashChange === true;
            var wantsPushState = this.emulateState === false && options.pushState === true;
            this.hasPushState = wantsPushState && this.history && this.history.pushState != null;
            this.root = options.root || '/';
            this.root = ("/" + this.root + "/").replace(this.rootStripper, '/');
            if (options.onerror) {
                this.onerror = options.onerror;
            }
        }
        Controller.prototype.start = function (startState, silent) {
            this.started = true;
            if (this.emulateState && (startState != null)) {
                this.pushEmulateState(startState.state, startState.title, startState.fragment);
            }
            if (this.hasPushState) {
                window.onpopstate = this.checkUrl;
            }
            else if (this.wantsHashChange && (window.onhashchange != null)) {
                window.onhashchange = this.checkUrl;
            }
            else if (this.wantsHashChange) {
                this.checkUrlInterval = setInterval(this.checkUrl, this.interval);
            }
            this.fragment = this.getFragment();
            if (!silent) {
                return this.loadUrl(null, null);
            }
        };
        Controller.prototype.getHash = function () {
            var match = this.location.href.match(/#(.*)$/);
            return (match != null ? match[1] : '');
        };
        Controller.prototype.getEmulateState = function () {
            if (this.stateList.length > 0) {
                return this.stateList[this.stateList.length - 1];
            }
            else {
                return {
                    fragment: "",
                    state: null,
                    title: ""
                };
            }
        };
        Controller.prototype.popEmulateState = function () {
            return this.stateList.pop();
        };
        Controller.prototype.pushEmulateState = function (state, title, fragment) {
            return this.stateList.push({
                state: state,
                title: title,
                fragment: fragment
            });
        };
        Controller.prototype.getFragment = function (fragment, forcePushState) {
            if (fragment === void 0) { fragment = null; }
            if (forcePushState === void 0) { forcePushState = false; }
            var root = '';
            if (fragment == null) {
                if (this.emulateState) {
                    fragment = this.getEmulateState().fragment;
                }
                else if (this.hasPushState || !this.wantsHashChange || forcePushState) {
                    fragment = this.location.pathname;
                    root = this.root.replace(this.trailingSlash, '');
                    if ((fragment.indexOf(root)) === 0) {
                        fragment = fragment.slice(root.length);
                    }
                }
                else {
                    fragment = this.getHash();
                }
            }
            return fragment.replace(this.routeStripper, '');
        };
        Controller.prototype.back = function () {
            if (this.emulateState === true) {
                this.popEmulateState();
                return this.loadUrl(null, null);
            }
            else {
                if (this.history == null)
                    return;
                if (typeof this.history.back === "function")
                    this.history.back();
            }
        };
        Controller.prototype.canBack = function () {
            if (this.emulateState === true) {
                return this.stateList.length > 1;
            }
            else {
                if (this.history == null)
                    return false;
                return typeof this.history.back === "function";
            }
        };
        Controller.prototype.route = function (route, callback) {
            return this.handlers.unshift({
                route: route,
                callback: callback
            });
        };
        Controller.prototype.checkUrl = function (e) {
            var fragment = this.getFragment();
            if (fragment === this.fragment) {
                return;
            }
            return this.loadUrl(fragment, e);
        };
        Controller.prototype.loadUrl = function (fragment, e) {
            try {
                fragment = this.fragment = this.getFragment(fragment);
                for (var _i = 0, _a = this.handlers; _i < _a.length; _i++) {
                    var handler = _a[_i];
                    if (handler.route.test(fragment)) {
                        return handler.callback(fragment, e);
                    }
                }
            }
            catch (error) {
                if (typeof this.onerror === "function") {
                    this.onerror(error);
                }
            }
        };
        Controller.prototype.navigate = function (fragment, options) {
            if (!this.started) {
                return false;
            }
            fragment = this.getFragment(fragment || '');
            var url = this.root + fragment;
            fragment = fragment.replace(this.pathStripper, '');
            if (this.fragment === fragment) {
                return;
            }
            this.fragment = fragment;
            if (fragment === '' && url !== '/') {
                url = url.slice(0, -1);
            }
            if (this.emulateState) {
                if (options.replace === true) {
                    this.popEmulateState();
                }
                var state = {};
                if (options.state != null) {
                    state = options.state;
                }
                var title = '';
                if (options.title != null) {
                    title = options.title;
                }
                this.pushEmulateState(state, title, fragment);
            }
            else if (this.hasPushState) {
                var method = options.replace ? 'replaceState' : 'pushState';
                var state = {};
                if (options.state != null) {
                    state = options.state;
                }
                var title = '';
                if (options.title != null) {
                    title = options.title;
                }
                this.history[method](state, title, url);
            }
            else if (this.wantsHashChange) {
                this._updateHash(this.location, fragment, options.replace);
            }
            else {
                return this.location.assign(url);
            }
            if (options.trigger) {
                return this.loadUrl(fragment, null);
            }
        };
        Controller.prototype._updateHash = function (location, fragment, replace) {
            if (replace) {
                var href = location.href.replace(/(javascript:|#).*$/, '');
                return location.replace(href + "#" + fragment);
            }
            else {
                return location.hash = "#" + fragment;
            }
        };
        return Controller;
    }());
});
