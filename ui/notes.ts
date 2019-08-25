import {Note} from "./note";
import {SourceCode } from "./source_code";
import {Lines} from "./line";
import {NoteElem, NoteClickListener, NotesChangedListener} from "./note_elem";

const PADDING = 5;
const MARGIN_FIRST = 30;
const MARGIN_OTHER = 5;

class Notes {
    notes: {[key: string]: NoteElem};
    container: HTMLElement;
    sourceCode: SourceCode;
    notesCount: number;
    lineToNote: {[lineNo: number]: {[key: string]: boolean}};
    lines: Lines;
    selected: string;
    changedListener: NotesChangedListener;

    constructor(container: HTMLElement,
         sourceCode: SourceCode, 
         lines: Lines,
         changedListener: NotesChangedListener) {
        this.notes = {};
        this.notesCount = 0;
        this.container = container;
        this.sourceCode = sourceCode;
        this.lines = lines;
        this.lineToNote = {};
        this.selected = null;
        this.changedListener = changedListener;
    }

    private loadNote(note: {[key: string]: any}) {
        return new Note(note)
    }
    
    load(notes: {[key: string]: any}[]) {
        this.notes = {};
        this.notesCount = 0;
        this.lineToNote = {};
        this.selected = null;
        this.container.innerHTML = '';
        this.lines.clear();

        for(let n of notes) {
            let note = this.loadNote(n);
            this.add(note);
        }
    }

    private onNoteClick(noteKey: string) {
        if(this.selected == noteKey) {
            this.clearSelected();
        } else {
            let y = this.notes[noteKey].elem.getBoundingClientRect().top;
            let lineNo = this.select(noteKey);
            if(lineNo != null) {
                this.lines.scroll(lineNo, y);
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

    private onCollapseCode(key: string) {
        let noteElem = this.notes[key];
        let match = noteElem.match;
        if(noteElem.note.codeCollapsed) {
            this.lines.isCollapsedHeader(match.start);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.lines.isCollapsed(i);
            }    
        } else {
            this.lines.noCollapsedHeader(match.start);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.lines.noCollapsed(i);
            }    
        }

        this.changedListener();
    }

    remove(noteElem: NoteElem) {
        delete this.notes[noteElem.key];
        noteElem.remove();
        let match = noteElem.match;
        if(match.start > match.end) {
            return;
        }
        
        for(let i = match.start; i <= match.start; ++i) {
            delete this.lineToNote[i][noteElem.key];
            this.lines.noComment(i);
        }

        if(noteElem.note.codeCollapsed) {
            this.lines.noCollapsedHeader(match.start);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.lines.noCollapsed(i);
            }    
        }
    }

    add(note: Note) {
        let match = this.sourceCode.match(note);
        let key = `${this.notesCount}`;
        let elem = new NoteElem(key, note, match, 
            this.onNoteClick.bind(this),
            this.onUpdate.bind(this),
            this.onCollapseCode.bind(this));

        let nextKey = null;
        let nextMatch = this.lines.lines.length;
        for(let k in this.notes) {
            let n = this.notes[k];
            if(n.match.start <= match.start) {
                continue;
            }
            if(nextMatch > n.match.start) {
                nextMatch = n.match.start;
                nextKey = k;
            }
        }

        this.notesCount++;
        this.notes[key] = elem;
        elem.update();

        if(nextKey == null) {
            this.container.appendChild(elem.elem);
        } else {
            this.container.insertBefore(elem.elem, this.notes[nextKey].elem);
        }

        if(match.start > match.end) {
            return;
        }
        for(let i = match.start; i <= match.start; ++i) {
            if(!(i in this.lineToNote)) {
                this.lineToNote[i] = {};
            }
            this.lineToNote[i][key] = true;
            this.lines.hasComment(i);
        }

        if(note.codeCollapsed) {
            this.lines.isCollapsedHeader(match.start);
            for(let i = match.start + 1; i <= match.end; ++i) {
                this.lines.isCollapsed(i);
            }    
        }

        return elem;
    }

    newNote(start: number, end: number) {
        let noteElem = this.create('New Note', start, end, {});
        this.select(noteElem.key);
        noteElem.edit();
    }

    private create(text: string, start: number, end: number, opt: {}) {
        let pre = [];
        let code = [];
        let post = [];

        for(let i = -PADDING; i < 0; ++i) {
            let line = this.lines.getCode(start + i);
            if(line != null) {
                pre.push(line);
            }
        }
        for(let i = start; i <= end; ++i) {
            code.push(this.lines.getCode(i));
        }
        for(let i = 1; i <= PADDING; ++i) {
            let line = this.lines.getCode(end + i);
            if(line != null) {
                post.push(line);
            }
        }

        let note = Note.create(pre, post, code, text, opt);
        return this.add(note);
    }

    moveToLine(lineNo: number) {
        for(let k in this.lineToNote[lineNo]) {
            this.select(k);
            break;
        }
    }

    isFirst(key: string) {
        let note = this.notes[key];

        for(let k in this.notes) {
            if(k === key) continue;

            let n = this.notes[k];
            if(n.match.start <= note.match.start) {
                return false;
            }
        }

        return true;
    }

    clearSelected() {
        if(this.selected) {
            let oldNote = this.notes[this.selected];
            oldNote.unselect();
            for(let i = oldNote.match.start; i <= oldNote.match.end; ++i) {
                this.lines.unselect(i);
            }
            this.selected = null;
        }
    }

    select(key: string) {
        this.clearSelected();

        let note = this.notes[key];
        note.select();
        for(let i = note.match.start; i <= note.match.end; ++i) {
            this.lines.select(i);
        }
        this.selected = key;
        let start = note.match.start;
        let isFirst = this.isFirst(key);

        if(note.match.start > note.match.end) {
            return null;
        }

        window.requestAnimationFrame(() => {
            let y = this.lines.getY(start);
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
        for(let k in this.notes) {
            let n = this.notes[k];
            json.push(n.note.getJSON());
        }

        return json;
    }
}

export {Notes};