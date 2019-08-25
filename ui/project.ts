import {api} from "./api";
import {SourceCode} from "./source_code";
import {Notes} from "./notes"
import {Note} from "./note"
import {Lines} from "./line"
import {Files} from "./files"

declare namespace hljs {
    function highlight(name, value, ignore_illegals, continuation);
}

class Project {
    source: SourceCode
    lines: Lines
    notes: Notes
    files: Files
    all_code: {[path: string]: string[]}
    all_notes: {[path: string]: Note[]}
    selected_file: string

    constructor() {
        this.source = new SourceCode([]);
        this.lines = new Lines(document.getElementById('source_code'),
            this.onCodeClick.bind(this),
            this.onNoteAdd.bind(this));
        this.notes = new Notes(document.getElementById("notes"), 
            this.source, this.lines,
            this.onNotesChanged.bind(this));     
        this.files = new Files(document.getElementById("files"),
            this.onFileClick.bind(this));      
    }

    open(path: string) {
        this.selected_file = path;
        this.source.load(this.all_code[path]);
        this.lines.load(this.source.lines);
        this.notes.load(this.all_notes[path]);
    }

    load() {
        api.getSourceLines((files) => {
            this.all_code = files;
            api.getNotes((notes) => {
                this.all_notes = notes;
                let files_list = [];
                for(let f in files) {
                    files_list.push(f);
                    if(!(f in this.all_notes)) {
                        this.all_notes[f] = [];
                    }
                }        
                this.files.load(files_list);

                for(let f in files) {
                    this.open(f);
                    break;
                }
            })
        })        
    }
    
    private onFileClick(file: string) {
        this.open(file);
    }

    private onCodeClick(lineNo: number) {
        this.notes.moveToLine(lineNo);
    }

    private onNoteAdd(lineNo: number) {
        this.notes.newNote(lineNo, lineNo);
    }

    private onNotesChanged() {
        this.all_notes[this.selected_file] = this.notes.toJSON();
        this.saveNotes();
    }

    private saveNotes() {
        api.setNotes(JSON.stringify(this.all_notes), () => {
            window.status = "Saved";
        })
    }
}

export {Project}