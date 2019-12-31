define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var API = {
        document: document
    };
    var TAGS = {
        svg: "a altGlyph altGlyphDef altGlyphItem animate animateColor animateMotion animateTransform circle clipPath color-profile cursor defs desc ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font font-face font-face-format font-face-name font-face-src font-face-uri foreignObject g glyph glyphRef hkern image line linearGradient marker mask metadata missing-glyph mpath path pattern polygon polyline radialGradient rect script set stop style svg symbol text textPath title tref tspan use view vkern switch foreignObject",
        html: "a abbr address article aside audio b bdi bdo blockquote body button canvas caption cite code colgroup datalist dd del details dfn div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup html i iframe ins kbd label legend li main map mark menu meter nav noscript object ol optgroup option output p pre progress q rp rt ruby s samp script section select small span strong style sub summary sup table tbody td textarea tfoot th thead time title tr u ul video",
        htmlVoid: "area base br col command embed hr img input keygen link meta param source track wbr"
    };
    var TAGS_DICT = {};
    for (var ns in TAGS) {
        var tags = TAGS[ns].split(" ");
        for (var _i = 0, tags_1 = tags; _i < tags_1.length; _i++) {
            var tag = tags_1[_i];
            TAGS_DICT[tag] = ns;
        }
    }
    var NAMESPACES = {
        svg: "http://www.w3.org/2000/svg",
        html: "http://www.w3.org/1999/xhtml",
        htmlVoid: null
    };
    function parseDefinition(str) {
        var res = {
            tag: '',
            id: null,
            classes: []
        };
        var parts = str.split(".");
        var first = parts[0];
        var firstParts = first.split('#');
        res.tag = firstParts[0];
        if (firstParts.length == 2) {
            res.id = firstParts[1];
        }
        else if (firstParts.length > 2) {
            throw Error("Invalid Definition: " + str);
        }
        if (parts.length > 1) {
            res.classes = parts.slice(1);
        }
        return res;
    }
    ;
    function getParameters(args) {
        var params = {
            def: null,
            text: null,
            attrs: null,
            func: null,
            parent: null
        };
        if (args.length == 0) {
            params.def = parseDefinition('div');
        }
        else if (typeof (args[0]) == 'string') {
            params.def = parseDefinition(args[0]);
            args = args.slice(1);
        }
        for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
            var arg = args_1[_i];
            switch (typeof arg) {
                case "function":
                    params.func = arg;
                    break;
                case "object":
                    if (arg instanceof HTMLElement || arg instanceof SVGElement) {
                        params.parent = arg;
                    }
                    else {
                        params.attrs = arg;
                    }
                    break;
                case "string":
                    params.text = arg;
            }
        }
        return params;
    }
    ;
    function domAPICreate() {
        function setStyles(elem, styles) {
            for (var k in styles) {
                var v = styles[k];
                if (v != null) {
                    elem.style.setProperty(k, v);
                }
                else {
                    elem.style.removeProperty(k);
                }
            }
        }
        function setEvents(elem, events) {
            for (var k in events) {
                var names = k.split('|');
                for (var _i = 0, names_1 = names; _i < names_1.length; _i++) {
                    var name_1 = names_1[_i];
                    elem.addEventListener(name_1, events[k], false);
                }
            }
        }
        function setData(elem, data) {
            for (var k in data) {
                elem[k] = data[k];
            }
        }
        function setAttributes(elem, attrs) {
            for (var k in attrs) {
                var v = attrs[k];
                switch (k) {
                    case "style":
                        setStyles(elem, v);
                        break;
                    case "on":
                        setEvents(elem, v);
                        break;
                    case "data":
                        setData(elem, v);
                    default:
                        if (v != null) {
                            elem.setAttribute(k, v);
                        }
                        else {
                            elem.removeAttribute(k);
                        }
                }
            }
        }
        var setIdClass;
        function setIdClassNew(elem, idClass) {
            if (idClass.id != null) {
                elem.id = idClass.id;
            }
            for (var _i = 0, _a = idClass.classes; _i < _a.length; _i++) {
                var c = _a[_i];
                elem.classList.add(c);
            }
        }
        function setIdClassFallback(elem, idClass) {
            if (idClass.id != null) {
                elem.id = idClass.id;
            }
            if (idClass.classes.length > 0) {
                var className = idClass.classes.join(" ");
                elem.setAttribute("class", className);
            }
        }
        ;
        function switchIdClass() {
            var elem = API.document.createElementNS("http://www.w3.org/2000/svg", "g");
            if (!elem.classList) {
                setIdClass = setIdClassFallback;
            }
            else {
                setIdClass = setIdClassNew;
            }
        }
        ;
        switchIdClass();
        function append() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var params = getParameters(args);
            var parent = params.parent;
            if (this != null && this._elem != null) {
                if (parent != null) {
                    throw Error("Cannot set a parent within a context");
                }
                parent = this._elem;
            }
            var elem;
            if (params.def == null) {
                elem = parent;
            }
            else {
                var tag = params.def.tag;
                var ns = NAMESPACES[TAGS_DICT[tag]];
                if (ns != null) {
                    elem = API.document.createElementNS(ns, tag);
                }
                else {
                    elem = API.document.createElement(tag);
                }
                if (params.def != null) {
                    setIdClass(elem, params.def);
                }
                if (params.attrs != null) {
                    setAttributes(elem, params.attrs);
                }
                if (parent != null) {
                    parent.appendChild(elem);
                }
            }
            if (params.func != null) {
                var state = {
                    _elem: elem
                };
                params.func(append.bind(state));
            }
            else if (params.text != null) {
                elem.textContent = params.text;
            }
            return elem;
        }
        ;
        return append;
    }
    exports.Weya = domAPICreate();
});
