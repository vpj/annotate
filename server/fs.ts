import * as UTIL from "util"
import * as FS from "fs"

type _readFileType = (path: string, options: { encoding: string }) => Promise<string>

let _readFile: _readFileType = <_readFileType>UTIL.promisify(FS.readFile)

export async function readFile(path: string): Promise<string> {
    return await _readFile(path, {encoding: 'utf-8'})
}
