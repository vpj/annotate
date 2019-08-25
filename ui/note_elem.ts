import {MathJax, MarkDown} from "./markdown";
import {NoteMatch} from "./source_code";
import {Note} from "./note";
import { createIcon } from "./util";

interface NoteClickListener {
    (noteKey: string): void
}

interface NoteEditListener {
    (): void
}

interface NotesChangedListener {
    (): void
}

interface NoteSaveListener {
    (): void
}

interface NoteUpdateListener {
    (noteElem: NoteElem, start: number, end: number, content: string): void
}


class NoteEditElem {
    elem: HTMLDivElement;
    button: HTMLButtonElement;
    start: HTMLInputElement;
    end: HTMLInputElement;
    textArea: HTMLTextAreaElement;
    saveListener: NoteSaveListener

    constructor(saveListener: NoteSaveListener) {
        this.elem = document.createElement('div')
        this.elem.className = 'edit';

        this.start = document.createElement('input');
        this.start.setAttribute('type', 'number');
        this.elem.appendChild(this.start);

        this.end = document.createElement('input');
        this.end.setAttribute('type', 'number');
        this.elem.appendChild(this.end);

        this.textArea = document.createElement('textarea');
        this.elem.appendChild(this.textArea);

        this.button = document.createElement('button');
        this.button.textContent = 'Save';
        this.elem.appendChild(this.button);

        this.button.addEventListener('click', this.onSaveClick.bind(this));

        this.saveListener = saveListener;
    }

    private onSaveClick() {
        if(this.saveListener != null) {
            this.saveListener();
        }
    }

    setContent(text: string, match: NoteMatch) {
        this.textArea.value = text;
        this.start.value = `${match.start + 1}`;
        this.end.value = `${match.end + 1}`;
    }

    getContent() {
        return this.textArea.value;
    }

    getStart() {
        return parseInt(this.start.value) - 1;
    }

    getEnd() {
        return parseInt(this.end.value) - 1;
    }
}

class NoteViewControls {
    elem: HTMLDivElement;
    edit: HTMLElement;
    collapse: HTMLElement;
    codeCollapse: HTMLElement;
    remove: HTMLElement;
    editListener: NoteEditListener
    removeListener: NoteEditListener

    constructor(editListener: NoteEditListener,
               removeListener: NoteEditListener,
               collapseListener: NoteEditListener,
               codeCollapseListener: NoteEditListener) {
        this.elem = document.createElement('div')
        this.elem.className = 'view_controls';

        this.collapse = createIcon('compress-arrows-alt');
        this.collapse.classList.add('collapse_note');
        this.elem.appendChild(this.collapse);
        this.collapse.addEventListener('click', collapseListener);

        this.codeCollapse = createIcon('minus-square');
        this.codeCollapse.classList.add('collapse_code');
        this.elem.appendChild(this.codeCollapse);
        this.codeCollapse.addEventListener('click', codeCollapseListener);

        this.edit = createIcon('edit');
        this.edit.classList.add('edit_button');
        this.elem.appendChild(this.edit);

        this.edit.addEventListener('click', this.onEditClick.bind(this));
        this.editListener = editListener;

        this.remove = createIcon('trash');
        this.remove.classList.add('remove_button');
        this.elem.appendChild(this.remove);

        this.remove.addEventListener('click', this.onRemoveClick.bind(this));
        this.removeListener = removeListener;
    }

    private onEditClick() {
        if(this.editListener != null) {
            this.editListener();
        }
    }

    private onRemoveClick() {
        if(this.removeListener != null) {
            this.removeListener();
        }
    }
}

class NoteElem {
    note: Note;
    match: NoteMatch;
    elem: HTMLDivElement;
    view: HTMLDivElement;
    viewControls: NoteViewControls;
    editElem: NoteEditElem;
    key: string;
    clickListener: NoteClickListener;
    updateListener: NoteUpdateListener;
    collapseListener: NoteClickListener;

    constructor(key: string, note: Note, match: NoteMatch,
         clickListener: NoteClickListener,
         updateListener: NoteUpdateListener,
         collapseListener: NoteClickListener) {
        this.key = key;
        this.note = note;
        this.match = match;
        this.elem = document.createElement('div');
        this.elem.classList.add("note");

        this.view = document.createElement('div');
        this.viewControls = new NoteViewControls(this.onEdit.bind(this),
                                                this.onRemove.bind(this),
                                                this.onCollapse.bind(this),
                                                this.onCodeCollapse.bind(this));
        this.elem.appendChild(this.view);
        this.elem.appendChild(this.viewControls.elem);
        this.view.className = 'view';

        this.editElem = new NoteEditElem(this.onSave.bind(this));
        this.elem.appendChild(this.editElem.elem);

        this.clickListener = clickListener;

        this.view.addEventListener('click', this.onClick.bind(this));
        this.updateListener = updateListener;
        this.collapseListener = collapseListener;
        this.setCollapse();
    }

    private onCodeCollapse() {
        this.note.codeCollapsed = !this.note.codeCollapsed;
        this.collapseListener(this.key);
    }

    private onCollapse() {
        this.note.collapsed = !this.note.collapsed;
        this.setCollapse();
        this.updateListener(null, null, null, null);
    }

    private setCollapse() {
        if(this.note.collapsed) {
            this.elem.classList.add('collapsed');
        } else {
            this.elem.classList.remove('collapsed');
        }
    }

    private onEdit() {
        this.edit()
    }
    
    private onRemove() {
        this.updateListener(this, null, null, null);
    }

    edit() {
        this.elem.classList.add('editing');
        this.editElem.setContent(this.note.note, this.match);
    }

    private onSave() {
        let start = this.editElem.getStart();
        let end = this.editElem.getEnd();
        let content = this.editElem.getContent();

        this.updateListener(this, start, end, content);
    }

    update() {
        const html = MarkDown.render(this.note.note);
        this.view.innerHTML = html;
        let scripts = this.view.getElementsByTagName('script');
        for(let i = 0; i < scripts.length; ++i) {
            let s = scripts[i];
            s.innerText = s.innerHTML.replace(/&amp;/g, '&');
        }
        window.requestAnimationFrame(() =>
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, this.view])
        )
    }

    remove() {
        this.elem.remove();
    }

    getY() {
        return this.elem.offsetTop;
    }

    select() {
        this.elem.classList.add("selected");
    }

    unselect() {
        this.elem.classList.remove('editing');
        this.elem.classList.remove("selected");
    }

    private onClick() {
        if(this.clickListener != null) {
            this.clickListener(this.key);
        }
    }
}

export {NoteElem, NoteClickListener, NotesChangedListener}