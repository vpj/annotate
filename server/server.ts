import { NodeHttpServerPort } from "./io/node"
import { StaticServer } from "./io/static"

let SERVER = new NodeHttpServerPort(8088, null, true)
let STATIC_SERVER = new StaticServer('/Users/varuna/ml/annotate/ui/out', new Set(['/api']))
SERVER.handleRequest = STATIC_SERVER.handleRequest

export { SERVER, STATIC_SERVER }