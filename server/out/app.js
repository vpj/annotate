"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const UTIL = require("util");
const PROCESS = require("process");
const FS = require("fs");
const PATH = require("path");
const assert_1 = require("assert");
const CWD = PROCESS.cwd();
console.log(`http://localhost:${server_1.SERVER.port}`);
console.log(CWD);
let EXTENSIONS = new Set(['.py']);
function getFileList(path) {
    return __awaiter(this, void 0, void 0, function* () {
        let lstat = UTIL.promisify(FS.lstat);
        if (!(yield lstat(path)).isDirectory()) {
            throw new assert_1.AssertionError();
        }
        let readdir = UTIL.promisify(FS.readdir);
        const files = yield readdir(path);
        let sourceFiles = [];
        // console.log(files)
        for (let f of files) {
            let file_path = PATH.join(path, f);
            if ((yield lstat(file_path)).isDirectory()) {
                sourceFiles = sourceFiles.concat(yield getFileList(file_path));
            }
            else {
                let ext = PATH.extname(file_path);
                if (EXTENSIONS.has(ext)) {
                    sourceFiles.push(file_path);
                }
            }
        }
        return sourceFiles;
    });
}
function readSource(path) {
    return __awaiter(this, void 0, void 0, function* () {
        let readFile = UTIL.promisify(FS.readFile);
        return readFile(path, { encoding: 'utf-8' });
    });
}
function getSources() {
    return __awaiter(this, void 0, void 0, function* () {
        let files = yield getFileList(CWD);
        let promises = files.map((f) => readSource(f));
        let code = yield Promise.all(promises);
        let source = {};
        for (let i = 0; i < files.length; ++i) {
            source[PATH.relative(CWD, files[i])] = code[i].split('\n');
        }
        let sourceStr = JSON.stringify(source);
        let writeFile = UTIL.promisify(FS.writeFile);
        yield writeFile(PATH.join(CWD, 'source.json'), sourceStr);
        return sourceStr;
    });
}
function getNotes() {
    return __awaiter(this, void 0, void 0, function* () {
        let readFile = UTIL.promisify(FS.readFile);
        try {
            let contents = yield readFile(PATH.join(CWD, 'notes.json'), { encoding: 'utf-8' });
            return contents;
        }
        catch (e) {
            return '{}';
        }
    });
}
server_1.STATIC_SERVER.addHandler('/notes.json', (req) => __awaiter(void 0, void 0, void 0, function* () {
    return { contentString: yield getNotes(), contentType: 'application/json' };
}));
server_1.STATIC_SERVER.addHandler('/source.json', (req) => __awaiter(void 0, void 0, void 0, function* () {
    return { contentString: yield getSources(), contentType: 'application/json' };
}));
server_1.SERVER.listen();
