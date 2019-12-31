"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const URL = require("url");
const PATH = require("path");
const FS = require("fs");
let CONTENT_TYPES = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.html': 'text/html'
};
function getContentType(ext) {
    let type = CONTENT_TYPES[ext];
    if (type == null)
        return 'text/plain';
    else
        return type;
}
class StaticServer {
    constructor(staticPath, ignore) {
        this.handleRequest = (req, res) => {
            let url = URL.parse(req.url);
            let path = url.pathname;
            if (this.ignore.has(path)) {
                return false;
            }
            if (this.invokeHandler(path, req, res)) {
                return true;
            }
            this.serveStatic(path, req, res);
            return true;
        };
        this.staticPath = staticPath;
        this.ignore = ignore;
        this.handlers = {};
    }
    addHandler(pathname, callback) {
        this.handlers[pathname] = callback;
    }
    invokeHandler(path, req, res) {
        if (!(path in this.handlers)) {
            return false;
        }
        let handler = this.handlers[path];
        let promise = handler(req);
        promise.then((content) => {
            res.writeHead(200, {
                'Content-Type': content.contentType,
                'Content-Length': Buffer.byteLength(content.contentString, 'utf8')
            });
            res.write(content.contentString);
            res.end();
        });
        return true;
    }
    serveStatic(path, req, res) {
        if ((path.indexOf('/')) === 0) {
            path = path.substr('/'.length);
        }
        if (path.length > 0 && path[0] === '.') {
            res.writeHead(403);
            res.end();
            return;
        }
        if (path === '' || PATH.extname(path) == '') {
            path = 'index.html';
        }
        let ext = PATH.extname(path);
        path = PATH.join('/Users/varuna/ml/annotate/ui/out', path);
        FS.readFile(path, function (err, content) {
            if (err != null) {
                res.writeHead(404);
                res.end();
            }
            else {
                res.writeHead(200, {
                    'Content-Type': getContentType(ext),
                    'Content-Length': content.length
                });
                return res.end(content, 'utf-8');
            }
        });
    }
}
exports.StaticServer = StaticServer;
