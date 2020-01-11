import { Router } from "./weya/router"
import { AjaxHttpPort } from "./io/ajax"


export let ROUTER = new Router({
    emulateState: false,
    hashChange: true,
    pushState: false,
    root: '',
    onerror: (e) => { console.error("Error", e) }
})

export let PORT = new AjaxHttpPort("http", "localhost", 8088, '/api')
