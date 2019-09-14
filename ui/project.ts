import {api} from "./api";
import {SourceView} from "./source_view";
import {SourceCodeMatcher} from "./source_code";
import {Notes} from "./notes"
import {Note} from "./note"
import {Files} from "./files"

declare namespace hljs {
    function highlight(name, value, ignore_illegals, continuation);
}

class Project {
    sourceView: SourceView
    sourceMatcher: SourceCodeMatcher
    notes: Notes
    files: Files
    all_code: {[path: string]: string[]}
    all_notes: {[path: string]: Note[]}
    selected_file: string

    constructor() {
        this.sourceMatcher = new SourceCodeMatcher();
        this.sourceView = new SourceView(document.getElementById('source_code'),
            this.onCodeClick.bind(this),
            this.onNoteAdd.bind(this));
        this.notes = new Notes(document.getElementById("notes"), this);
        this.files = new Files(document.getElementById("files"),
            this.onFileClick.bind(this));      
    }

    selectFile(path: string) {
        this.selected_file = path;
        this.sourceView.selectFile(path);
        this.notes.selectFile(path);
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
                this.sourceMatcher.load(this.all_code);
                this.sourceView.load(this.all_code);
                this.notes.load(this.all_notes);

                for(let f in files) {
                    this.selectFile(f);
                    break;
                }

                for(let f in files) {
                    if(this.all_notes[f].length > 0) {
                        console.log(f);
                    }
                    this.files.updateNotes(f, this.all_notes[f].length != 0)
                }
            })
        })        
    }
    
    private onFileClick(file: string) {
        this.selectFile(file);
    }

    private onCodeClick(path: string, lineNo: number) {
        this.notes.moveToLine(path, lineNo);
    }

    private onNoteAdd(path: string, start: number, end: number) {
        this.notes.newNote(path, start, end);
    }

    private onNotesChanged() {
        this.all_notes[this.selected_file] = this.notes.toJSON();
        this.saveNotes();
    }

    private saveNotes() {
        this.files.updateNotes(this.selected_file, this.all_notes[this.selected_file].length != 0);
        api.setNotes(JSON.stringify(this.all_notes), () => {
            window.status = "Saved";
        })
    }
}

export {Project}