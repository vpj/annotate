import { NodeHttpServerPort } from "./io/node"
import { StaticServer } from "./io/static"
import * as PATH from "path"

let static_path = PATH.resolve(__dirname, '../../ui/out')
let SERVER = new NodeHttpServerPort(8088, null, true)
let STATIC_SERVER = new StaticServer(static_path, new Set(['/api']))
SERVER.handleRequest = STATIC_SERVER.handleRequest

export { SERVER, STATIC_SERVER }
