"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_node_1 = require("./io/io_node");
const static_1 = require("./io/static");
let SERVER = new io_node_1.NodeHttpServerPort(8088, null, true);
exports.SERVER = SERVER;
let STATIC_SERVER = new static_1.StaticServer('/Users/varuna/ml/annotate/ui/out', new Set(['/api']));
exports.STATIC_SERVER = STATIC_SERVER;
SERVER.handleRequest = STATIC_SERVER.handleRequest;
