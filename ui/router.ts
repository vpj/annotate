/* From https://github.com/vpj/weya/blob/master/router.ts */
export class Router {
    private optionalParam = /\((.*?)\)/g;
    private namedParam = /(\(\?)?:\w+/g;
    private splatParam = /\*\w+/g;
    private escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

    private event
    private history
    private controller

    constructor(options: RouterOptions) {
        this.event = null;
        this.history = [];
        this.controller = new Controller(options)
    }

    start(startState: any, silent: boolean) {
        let fragment = this.controller.getFragment()
        this.controller.start(startState, silent)
        if (silent === true) {
            this.history.push({
                fragment: fragment,
                title: document.title
            });
        }
    };

    back() {
        if (this.history.length > 1) {
            return this.controller.back();
        }
    };

    canBack() {
        if (this.history.length > 1 && this.controller.canBack()) {
            return true;
        } else {
            return false;
        }
    };

    route(route: string | RegExp, callbacks: Function[]) {
        if ((Object.prototype.toString.call(route)) !== '[object RegExp]') {
            route = this._routeToRegExp(<string>route);
        }
        this.controller.route(<RegExp>route, (fragment: string, event) => {
            let args = this._extractParameters(<RegExp>route, fragment);
            this.event = event;
            if (this.event != null && this.event.type === "popstate") {
                this.history.pop();
                if (this.history.length === 0) {
                    this.history.push({
                        fragment: fragment,
                        title: document.title,
                        state: this.getState()
                    });
                }
            } else {
                this.history.push({
                    fragment: fragment,
                    title: document.title,
                    state: this.getState()
                });
            }
            for (let callback of callbacks) {
                if (!callback.apply(this, args)) {
                    break;
                }
            }
        })
    }

    getState() {
        if (this.event == null) return null
        else if (this.event.originalEvent == null) return null
        else return this.event.originalEvent
    };

    navigate(fragment: string, options?: NavigateOptions) {
        if (!options) options = { replace: false, trigger: true, title: '', state: null }
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


    _routeToRegExp(route: string) {
        route = route
            .replace(this.escapeRegExp, '\\$&')
            .replace(this.optionalParam, '(?:$1)?')
            .replace(this.namedParam, (match, optional) => {
                if (optional) {
                    return match;
                } else {
                    return '([^\/]+)';
                }
            }).replace(this.splatParam, '(.*?)')
        return new RegExp("^" + route + "$")
    };

    _extractParameters(route: RegExp, fragment: string) {
        let params = route.exec(fragment).slice(1);
        let results = [];
        for (let p of params) {
            if (p != null)
                results.push(decodeURIComponent(p))
        }
        return results;
    }

    getParams(search: string) {
        let vars = search.substr(1)
            .split('&')
        let params = {}
        for (let v of vars) {
            let pair = v.split('=')
            params[pair[0]] = decodeURIComponent(pair[1])
        }

        return params
    }
}

interface State {
    fragment: string,
    title: string
    state: any
}

interface ErrorCallback {
    (e: any): void
}

interface NavigateOptions {
    replace: boolean,
    trigger: boolean,
    title: string,
    state: any
}

interface RouterOptions {
    emulateState: boolean
    hashChange: boolean
    pushState: boolean
    root: string
    onerror: ErrorCallback
}

class Controller {

    private routeStripper = /^[#\/]|\s+$/g;

    private rootStripper = /^\/+|\/+$/g;

    private trailingSlash = /\/$/;

    private pathStripper = /[?#].*$/;
    private interval = 50

    private handlers
    private history
    private location
    private stateList: State[]
    private emulateState: boolean
    private hasPushState: boolean
    private wantsHashChange: boolean
    private root: string
    private checkUrlInterval: number
    private fragment: string
    private started: boolean
    private onerror: ErrorCallback

    constructor(options: RouterOptions) {
        this.handlers = [];
        this.checkUrl = this.checkUrl.bind(this);
        this.history = window.history;
        this.location = window.location;
        this.stateList = [];
        this.started = false

        this.emulateState = options.emulateState || false
        this.wantsHashChange = this.emulateState === false && options.hashChange === true
        let wantsPushState = this.emulateState === false && options.pushState === true
        this.hasPushState = wantsPushState && this.history && this.history.pushState != null

        this.root = options.root || '/'
        this.root = ("/" + this.root + "/").replace(this.rootStripper, '/');

        if (this.hasPushState) {
            window.onpopstate = this.checkUrl;
        } else if (this.wantsHashChange && (window.onhashchange != null)) {
            window.onhashchange = this.checkUrl;
        } else if (this.wantsHashChange) {
            this.checkUrlInterval = setInterval(this.checkUrl, this.interval);
        }
        if (options.onerror) {
            this.onerror = options.onerror
        }
    }

    start(startState: any, silent: boolean) {
        this.started = true;
        if (this.emulateState && (startState != null)) {
            this.pushEmulateState(startState.state, startState.title, startState.fragment);
        }
        this.fragment = this.getFragment();
        if (!silent) {
            return this.loadUrl(null, null);
        }
    };


    getHash() {
        let match = this.location.href.match(/#(.*)$/);
        return (match != null ? match[1] : '');
    };

    getEmulateState() {
        if (this.stateList.length > 0) {
            return this.stateList[this.stateList.length - 1];
        } else {
            return {
                fragment: "",
                state: null,
                title: ""
            }
        }
    }

    popEmulateState() {
        return this.stateList.pop();
    };

    pushEmulateState(state: any, title: string, fragment: string) {
        return this.stateList.push({
            state: state,
            title: title,
            fragment: fragment
        });
    };

    getFragment(fragment: string = null, forcePushState: boolean = false) {
        let root = ''
        if (fragment == null) {
            if (this.emulateState) {
                fragment = this.getEmulateState().fragment;
            } else if (this.hasPushState || !this.wantsHashChange || forcePushState) {
                fragment = this.location.pathname;
                root = this.root.replace(this.trailingSlash, '');
                if ((fragment.indexOf(root)) === 0) {
                    fragment = fragment.slice(root.length);
                }
            } else {
                fragment = this.getHash();
            }
        }
        return fragment.replace(this.routeStripper, '');
    };

    back() {
        if (this.emulateState === true) {
            this.popEmulateState();
            return this.loadUrl(null, null);
        } else {
            if (this.history == null) return;
            if (typeof this.history.back === "function")
                this.history.back()
        }
    };

    canBack() {
        if (this.emulateState === true) {
            return this.stateList.length > 1;
        } else {
            if (this.history == null) return false;
            return typeof this.history.back === "function"
        }
    };

    route(route: RegExp, callback: Function) {
        return this.handlers.unshift({
            route: route,
            callback: callback
        });
    };

    checkUrl(e: Event) {
        let fragment = this.getFragment();
        if (fragment === this.fragment) {
            return;
        }
        return this.loadUrl(fragment, e);
    };

    loadUrl(fragment: string, e: Event) {
        try {
            fragment = this.fragment = this.getFragment(fragment);
            for (let handler of this.handlers) {
                if (handler.route.test(fragment)) {
                    return handler.callback(fragment, e);
                }
            }
        } catch (error) {
            if (typeof this.onerror === "function") {
                this.onerror(error);
            }
        }
    };

    navigate(fragment: string, options: NavigateOptions) {
        if (!this.started) {
            return false;
        }
        fragment = this.getFragment(fragment || '');
        let url = this.root + fragment;
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
            let state = {};
            if (options.state != null) {
                state = options.state;
            }
            let title = '';
            if (options.title != null) {
                title = options.title;
            }
            this.pushEmulateState(state, title, fragment);
        } else if (this.hasPushState) {
            let method = options.replace ? 'replaceState' : 'pushState';
            let state = {};
            if (options.state != null) {
                state = options.state;
            }
            let title = '';
            if (options.title != null) {
                title = options.title;
            }
            this.history[method](state, title, url);
        } else if (this.wantsHashChange) {
            this._updateHash(this.location, fragment, options.replace);
        } else {
            return this.location.assign(url);
        }
        if (options.trigger) {
            return this.loadUrl(fragment, null);
        }
    };

    _updateHash(location: Location, fragment: string, replace: boolean) {
        if (replace) {
            let href = location.href.replace(/(javascript:|#).*$/, '');
            return location.replace(href + "#" + fragment);
        } else {
            return location.hash = "#" + fragment;
        }
    }
}