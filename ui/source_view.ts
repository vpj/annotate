import {api} from "./api";
import {SourceCodeMatcher} from "./source_code";
import {Notes} from "./notes"
import {Note} from "./note"
import {Lines} from "./line"
import {Files} from "./files"
import { getLanguage } from "./util";

interface LineClickListener {
    (path: string, lineNo: number): void
}

interface NoteAddListener {
    (path: string, start: number, end: number): void
}

class SourceView {
    lines: Lines
    all_code: {[path: string]: string[]}
    selected_file: string
    lineClickListener: LineClickListener;
    noteAddListener: NoteAddListener;

    constructor(lineClickListener: LineClickListener, noteAddListener: NoteAddListener) {
        this.all_code = {};
        this.lines = new Lines(document.getElementById('source_code'),
            this.onLineClick.bind(this),
            this.onNoteAdd.bind(this));
        this.lineClickListener = lineClickListener;
        this.noteAddListener = noteAddListener;
    }

    open(path: string) {
        this.selected_file = path;
        this.lines.load(this.all_code[path], getLanguage(path));
    }

    load(files: {[path: string]: string[]}) {
        this.all_code = files;
    }
    
    private onLineClick(lineNo: number) {
        this.lineClickListener(this.selected_file, lineNo);
    }

    private onNoteAdd(start: number, end: number) {
        this.noteAddListener(this.selected_file, start, end);
    }
}

export {SourceView}