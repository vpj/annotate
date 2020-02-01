import {SERVER, STATIC_SERVER} from "./server"
import {CallPacket, Data, IOResponse} from "./io/io"
import * as UTIL from "util"
import * as PROCESS from "process"
import * as FS from "fs"
import * as FS2 from "./fs"
import * as PATH from "path"
import {AssertionError} from "assert"

const CWD = PROCESS.cwd()
console.log(`http://localhost:${SERVER.port}`)
console.log(CWD)
let EXTENSIONS = new Set(['.py'])

async function getFileList(path: string): Promise<string[]> {
    let lstat = UTIL.promisify(FS.lstat)
    if (!(await lstat(path)).isDirectory()) {
        throw new AssertionError()
    }

    let readdir = UTIL.promisify(FS.readdir)
    const files = await readdir(path)
    let sourceFiles = []

    // console.log(files)

    for (let f of files) {
        let file_path = PATH.join(path, f)
        if ((await lstat(file_path)).isDirectory()) {
            sourceFiles = sourceFiles.concat(await getFileList(file_path))
        } else {
            let ext = PATH.extname(file_path)

            if (EXTENSIONS.has(ext)) {
                sourceFiles.push(file_path)
            }
        }
    }

    return sourceFiles
}

async function readSource(path: string): Promise<string> {
    return await FS2.readFile(path)
}

async function getSources(): Promise<string> {
    let files = await getFileList(CWD)
    let promises = files.map((f) => readSource(f))
    let code = await Promise.all(promises)
    let source = {}
    for (let i = 0; i < files.length; ++i) {
        source[PATH.relative(CWD, files[i])] = code[i].split('\n')
    }

    let sourceStr = JSON.stringify(source, null, 2)
    let writeFile = UTIL.promisify(FS.writeFile)
    await writeFile(PATH.join(CWD, 'source.json'), sourceStr)
    return sourceStr
}

async function getNotes(): Promise<string> {
    try {
        return await FS2.readFile(PATH.join(CWD, 'notes.json'))
    } catch (e) {
        return '{}'
    }
}

STATIC_SERVER.addHandler('/notes.json', async () => {
    return { contentString: await getNotes(), contentType: 'application/json' }
})

STATIC_SERVER.addHandler('/source.json', async () => {
    return { contentString: await getSources(), contentType: 'application/json' }
})

async function handleSaveNotes(data: Data, packet: CallPacket, response: IOResponse) {
    let notesStr = JSON.stringify(data, null, 2)
    let writeFile = UTIL.promisify(FS.writeFile)
    await writeFile(PATH.join(CWD, 'notes.json'), notesStr)

    response.success(null)
}

SERVER.on('saveNotes', (data, packet, response) => {
    handleSaveNotes(data, packet, response)
})

SERVER.listen()
