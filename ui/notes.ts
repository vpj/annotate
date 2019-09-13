import {Note} from "./note";
import {SourceCodeMatcher } from "./source_code";
import {Lines} from "./line";
import {NoteElem, NoteClickListener, NotesChangedListener} from "./note_elem";
import { Project } from "./project";

const PADDING = 5;
const MARGIN_FIRST = 30;
const MARGIN_OTHER = 5;

class Notes {
    notes: {[path: string]: {[key: string]: NoteElem}};
    project: Project;
    container: HTMLElement;
    notesCount: number;
    lineToNote: {[lineNo: number]: {[key: string]: boolean}};
    selected?: string;
    changedListener: NotesChangedListener;
    selectedFile?: string;
    renderedNotes: NoteElem[];

    constructor(container: HTMLElement, project: Project) {
        this.notes = {};
        this.notesCount = 0;
        this.container = container;
        this.project = project;
        this.lineToNote = {};
        this.selected = null;
        this.selectedFile = null;
    }

    private loadNote(path: string, note: {[key: string]: any}) {
        return new Note(path, note)
    }
    
    load(notes: {[path: string]: {[key: string]: any}[]}) {
        this.notes = {};
        this.notesCount = 0;
        this.lineToNote = {};
        this.selected = null;
        this.container.innerHTML = '';

        for(let path in notes) {
            for(let n of notes[path]) {
                let note = this.loadNote(path, n);
                this.add(path, note);
            }
        }
    }

    private onNoteClick(path: string, noteKey: string) {
        if(this.selected == noteKey) {
            this.clearSelected();
        } else {
            let y = this.notes[path][noteKey].elem.getBoundingClientRect().top;
            let lineNo = this.select(noteKey);
            if(lineNo != null) {
                this.project.sourceView.scroll(path, lineNo, y);
            }
        }
    }

    private onUpdate(noteElem: NoteElem, start: number, end: number, content: string) {
        if(noteElem != null) {
            if(this.selected === noteElem.key) {
                this.clearSelected();
            }
            this.remove(noteElem);
            if(content != null && content.trim() != '') {
                let newNoteElem = this.create(content, start, end,
                     noteElem.note.getJSON());
                this.select(newNoteElem.key);
            }
        }

        this.changedListener();
    }

    private onCollapseCode(path: string, key: string) {
        let noteElem = this.notes[path][key];
        let match = noteElem.match;
        if(noteElem.note.codeCollapsed) {
            this.project.sourceView.setCollapsedHeader(path, match.start, true);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(path, i, true);
            }    
        } else {
            this.project.sourceView.setCollapsedHeader(path, match.start, false);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(path, i, false);
            }    
        }

        this.changedListener();
    }

    remove(noteElem: NoteElem) {
        let path = noteElem.note.path;
        delete this.notes[path][noteElem.key];
        noteElem.remove();
        for(let i = 0; i < this.renderedNotes.length; ++i) {
            if(this.renderedNotes[i] === noteElem) {
                this.renderedNotes.remove(i);
                break;
            }
        }

        let match = noteElem.match;
        if(match.start > match.end) {
            return;
        }
        
        for(let i = match.start; i <= match.start; ++i) {
            delete this.lineToNote[i][noteElem.key];
            this.project.sourceView.removeComment(path, i);
        }

        if(noteElem.note.codeCollapsed) {
            this.project.sourceView.setCollapsedHeader(path, match.start, false);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(path, i, false);
            }    
        }
    }

    add(note: Note) {
        let match = this.project.sourceMatcher.match(note);
        let key = `${this.notesCount}`;
        let elem = new NoteElem(key, note, match, 
            this.onNoteClick.bind(this),
            this.onUpdate.bind(this),
            this.onCollapseCode.bind(this));

        let nextNoteIdx = null;
        let rank = this.project.sourceView.getRenderedLineRank(note.path, match.start);
        for(let i = 0; i < this.renderedNotes.length; ++i) {
            let n = this.renderedNotes[i];
            let r = this.project.sourceView.getLineRank(n.path, n.match.start);

            if(r > rank) {
                nextNoteIdx = i;
                break;
            }
        }

        this.notesCount++;
        this.notes[note.path][key] = elem;
        elem.update();

        if(nextNoteIdx == null) {
            this.container.appendChild(elem.elem);
            this.renderedNotes.push(elem);
        } else {
            this.container.insertBefore(elem.elem, this.renderedNotes[nextNoteIdx]);
            this.renderedNotes.insertBefore(nextNoteIdx, elem);
        }

        if(match.start > match.end) {
            return;
        }
        for(let i = match.start; i <= match.start; ++i) {
            if(!(i in this.lineToNote)) {
                this.lineToNote[i] = {};
            }
            this.lineToNote[i][key] = true;
            this.project.sourceView.addComment(note, path, i);
        }

        if(note.codeCollapsed) {
            this.project.sourceView.setCollapsedHeader(note.path, match.start, true);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.project.sourceView.setCollapsed(note.path, i, true);
            }    
        }

        return elem;
    }

    newNote(path: string, start: number, end: number) {
        let noteElem = this.create(path, '', start, end, {});
        this.select(noteElem.key);
        noteElem.edit();
    }

    private create(path: string, text: string, start: number, end: number, opt: {}) {
        let pre = [];
        let code = [];
        let post = [];

        for(let i = -PADDING; i < 0; ++i) {
            let line = this.project.sourceView.getCode(path, start + i);
            if(line != null) {
                pre.push(line);
            }
        }
        for(let i = start; i <= end; ++i) {
            code.push(this.project.sourceView.getCode(path, i));
        }
        for(let i = 1; i <= PADDING; ++i) {
            let line = this.project.sourceView.getCode(path, end + i);
            if(line != null) {
                post.push(line);
            }
        }

        let note = Note.create(path, pre, post, code, text, opt);
        return this.add(note);
    }

    moveToLine(path: string, lineNo: number) {
        for(let k in this.lineToNote[path][lineNo]) {
            this.select(path, k);
            break;
        }
    }

    clearSelected() {
        if(this.selected) {
            let oldNote = this.notes[this.selected.path][this.selected.key];
            oldNote.unselect();
            for(let i = oldNote.match.start; i <= oldNote.match.end; ++i) {
                this.project.sourceView.unselect(this.selected.path, i);
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
            this.project.sourceView.selectLine(path, i);
        }
        this.selected = key;
        let start = note.match.start;
        let isFirst = this.renderedNotes[0] === note;

        if(note.match.start > note.match.end) {
            return null;
        }

        window.requestAnimationFrame(() => {
            let y = this.project.sourceView.getLineVerticalPosition(start);
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

    toJSON() {
        let json = [];
        for(let path in this.notes) {
            for(let k in this.notes[path]) {
                let n = this.notes[k][path];
                json.push(n.note.getJSON());
            }
        }

        return json;
    }
}

export {Notes};