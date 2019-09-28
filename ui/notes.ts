import {Note} from "./note";
import {NoteElem, NoteClickListener} from "./note_elem";
import { Project } from "./project";

const PADDING = 5;
const MARGIN_FIRST = 30;
const MARGIN_OTHER = 5;

class Notes {
    notes: {[path: string]: {[key: string]: NoteElem}};
    project: Project;
    container: HTMLElement;
    notesCount: number;
    lineToNote: {[path: string]: {[lineNo: number]: {[key: string]: boolean}}};
    selected?: NoteElem;
    selectedFile?: string;
    renderedNotes: NoteElem[];
    notesSearch: HTMLInputElement;

    constructor(container: HTMLElement, project: Project) {
        this.notes = {};
        this.notesCount = 0;
        this.container = container;
        this.project = project;
        this.lineToNote = {};
        this.selected = null;
        this.selectedFile = null;
        this.renderedNotes = [];
        this.notesSearch = <HTMLInputElement>document.getElementById('notes_search');
        this.notesSearch.addEventListener('keyup', this.onSearch);
        this.notesSearch.addEventListener('change', this.onSearch);
        this.notesSearch.addEventListener('paste', this.onSearch);
    }

    onSearch = () => {
        let search = this.notesSearch.value;

        let selected: NoteElem[] = [];
        for(let path in this.notes) {
            let notes = this.notes[path];
            for(let key in notes) {
                let note = notes[key];
                if(note.note.note.toLowerCase().indexOf(search) !== -1) {
                    selected.push(note);
                }
            }
        }

        this.removeAll();
        this.project.sourceView.search();

        for(const note of selected) {
            this.project.sourceView.selectLines(note.note.path,
                note.match.start - 10, note.match.end + 10);
        }

        this.project.sourceView.renderSelectedLines();

        for(const note of selected) {
                this.renderNote(note);
        }
    }


    private renderNote(note: NoteElem) {
        note.render();
        let nextNoteIdx = null;
        const match = note.match;
        const path = note.note.path;

        let rank = this.project.sourceView.getRenderedLineRank(path, match.start);
        for(let i = 0; i < this.renderedNotes.length; ++i) {
            let n = this.renderedNotes[i];
            let r = this.project.sourceView.getRenderedLineRank(n.note.path, n.match.start);

            if(r > rank) {
                nextNoteIdx = i;
                break;
            }
        }

        note.update();

        if(nextNoteIdx == null) {
            this.container.appendChild(note.elem);
            this.renderedNotes.push(note);
        } else {
            this.container.insertBefore(note.elem, this.renderedNotes[nextNoteIdx].elem);
            this.renderedNotes.splice(nextNoteIdx, 0, note);
        }

        if(!(path in this.lineToNote)) {
            this.lineToNote[path] = {};
        }

        if(match.start > match.end) {
            return;
        }
        for(let i = match.start; i <= match.start; ++i) {
            if(!(i in this.lineToNote)) {
                this.lineToNote[path][i] = {};
            }
            this.lineToNote[path][i][note.key] = true;
            this.project.sourceView.addComment(path, i);
        }

        if(note.note.codeCollapsed) {
            this.project.sourceView.setCollapsedHeader(path, match.start, true);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(path, i, true);
            }    
        }
    }

    private addNote(note: Note): NoteElem {
        let match = this.project.sourceMatcher.match(note);
        let key = `${this.notesCount}`;
        let elem = new NoteElem(key, note, match, 
            this.onNoteClick,
            this.onUpdate,
            this.onCollapseCode);

        this.notesCount++;
        if(!(note.path in this.notes)) {
            this.notes[note.path] = {};
        }
        this.notes[note.path][key] = elem;

        return elem;
    }

    load(notes: {[path: string]: {[key: string]: any}[]}) {
        this.notes = {};
        this.notesCount = 0;
        this.lineToNote = {};
        this.selected = null;
        this.container.innerHTML = '';

        for(let path in notes) {
            for(let n of notes[path]) {
                let note = new Note(path, n);
                this.addNote(note);
            }
        }
    }

    private removeAll() {
        for(const n of this.renderedNotes) {
            n.remove();
        }

        this.renderedNotes = [];
        this.selected = null;
    }

    selectFile(path: string) {
        this.selectedFile = path;
        this.removeAll();
        let notes = this.notes[path];

        for(const k in notes) {
            this.renderNote(notes[k]);
        }
    }

    private onNoteClick = (path: string, key: string) => {
        const note = this.notes[path][key];
        if(this.selected === note) {
            this.clearSelected();
        } else {
            let y = note.elem.getBoundingClientRect().top;
            let lineNo = this.select(path, key);
            if(lineNo != null) {
                this.project.sourceView.scroll(path, lineNo, y);
            }
        }
    }

    private create(path: string, text: string, start: number, end: number, opt: {}) {
        let pre: string[] = [];
        let code: string[] = [];
        let post: string[] = [];

        for(let i = -PADDING; i < 0; ++i) {
            let line = this.project.sourceView.getCode(path, start + i);
            if(line != null) {
                pre.push(line.code);
            }
        }
        for(let i = start; i <= end; ++i) {
            code.push(this.project.sourceView.getCode(path, i).code);
        }
        for(let i = 1; i <= PADDING; ++i) {
            let line = this.project.sourceView.getCode(path, end + i);
            if(line != null) {
                post.push(line.code);
            }
        }

        let note = Note.create(path, pre, post, code, text, opt);
        let noteElem = this.addNote(note);
        this.renderNote(noteElem);

        return noteElem;
    }

    private onUpdate = (note: NoteElem, isSaveOnly: boolean, start: number, end: number, content: string) => {
        if(!isSaveOnly) {
            if(this.selected === note) {
                this.clearSelected();
            }
            this.remove(note);
            if(content != null && content.trim() != '') {
                let newNote = this.create(note.note.path, content, start, end,
                        note.note.toJSON());
                this.select(newNote.note.path, newNote.key);
            }
        }

        this.project.updateNotes(note.note.path, this.toJSON())
    }

    private onCollapseCode = (path: string, key: string) => {
        let note = this.notes[path][key];
        let match = note.match;
        if(note.note.codeCollapsed) {
            this.project.sourceView.setCollapsedHeader(note.note.path, match.start, true);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(note.note.path, i, true);
            }    
        } else {
            this.project.sourceView.setCollapsedHeader(note.note.path, match.start, false);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(note.note.path, i, false);
            }    
        }

        this.project.updateNotes(note.note.path, this.toJSON())
    }

    remove(note: NoteElem) {
        if(!note.isRendered()) {
            return;
        }

        let path = note.note.path;
        delete this.notes[path][note.key];
        note.remove();
        for(let i = 0; i < this.renderedNotes.length; ++i) {
            if(this.renderedNotes[i] === note) {
                this.renderedNotes.splice(i, 1);
                break;
            }
        }

        let match = note.match;
        if(match.start > match.end) {
            return;
        }
        
        for(let i = match.start; i <= match.start; ++i) {
            delete this.lineToNote[path][i][note.key];
            this.project.sourceView.removeComment(path, i);
        }

        if(note.note.codeCollapsed) {
            this.project.sourceView.setCollapsedHeader(path, match.start, false);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(path, i, false);
            }    
        }
    }

    newNote(path: string, start: number, end: number) {
        let noteElem = this.create(path, '', start, end, {});
        this.select(path, noteElem.key);
        noteElem.edit();
    }

    moveToLine(path: string, lineNo: number) {
        for(let k in this.lineToNote[path][lineNo]) {
            this.select(path, k);
            break;
        }
    }

    clearSelected() {
        if(this.selected) {
            let oldNote = this.notes[this.selected.note.path][this.selected.key];
            oldNote.unselect();
            for(let i = oldNote.match.start; i <= oldNote.match.end; ++i) {
                this.project.sourceView.setSelected(this.selected.note.path, i, false);
            }
            this.selected = null;
            if(oldNote.note.note.trim() == '') {
                this.remove(oldNote);
            }
        }
    }

    select(path: string, key: string) {
        this.clearSelected();

        let note = this.notes[path][key];
        note.select();
        for(let i = note.match.start; i <= note.match.end; ++i) {
            this.project.sourceView.setSelected(path, i, true);
        }
        this.selected = note;
        let start = note.match.start;
        let isFirst = this.renderedNotes[0] === note;

        if(note.match.start > note.match.end) {
            return null;
        }

        window.requestAnimationFrame(() => {
            let y = this.project.sourceView.getY(path, start);
            let yn = note.getY();

            let transform = y - yn;
            if(isFirst)
                transform -= MARGIN_FIRST;
            else
                transform -= MARGIN_OTHER;

            this.container.style.transform=`translateY(${transform}px)`;
        })

        return start;
    }

    toJSON(): {[path: string]: {[key: string]: any}[]} {
        let allNotes = {};
        for(let path in this.notes) {
            let json = [];
            for(let k in this.notes[path]) {
                let n = this.notes[path][k];
                json.push(n.note.toJSON());
            }
            allNotes[path] = json;
        }

        return allNotes;
    }
}

export {Notes};