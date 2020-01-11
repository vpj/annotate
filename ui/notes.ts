import { Note } from "./note"
import { NoteElem } from "./note_elem"
import { Project } from "./project"

const PADDING = 5
const MARGIN_FIRST = 30
const MARGIN_OTHER = 5

class Notes {
    notes: { [path: string]: { [key: string]: NoteElem } }
    container: HTMLElement
    notesCount: number
    selected?: NoteElem
    selectedFile?: string
    renderedNotes: NoteElem[]
    searchElem: HTMLInputElement
    searchTerm: string

    constructor(container: HTMLElement) {
        this.notes = {}
        this.notesCount = 0
        this.container = container
        this.selected = null
        this.selectedFile = null
        this.renderedNotes = []
        this.searchElem = <HTMLInputElement>document.getElementById('notes_search')
        this.searchElem.addEventListener('keyup', this.onSearch)
        this.searchElem.addEventListener('change', this.onSearch)
        this.searchElem.addEventListener('paste', this.onSearch)
    }

    onSearch = () => {
        let search = this.searchElem.value
        if (search === this.searchTerm) {
            return
        }

        Project.instance().searchNotes(search)
        // this.search(search)
    }

    search(search: string) {
        this.searchTerm = search
        this.selectedFile = null
        let selected: NoteElem[] = []
        for (let path in this.notes) {
            let notes = this.notes[path]
            for (let key in notes) {
                let note = notes[key]
                if (note.note.note.toLowerCase().indexOf(search) !== -1) {
                    selected.push(note)
                }
            }
        }

        Project.instance().sourceView.search()

        for (const note of selected) {
            Project.instance().sourceView.selectLines(note.note.path,
                note.match.start - 3, note.match.end + 3)
        }

        Project.instance().sourceView.renderSelectedLines()

        this.removeAll()
        for (const note of selected) {
            this.renderNote(note)
        }

        this.selectDefault()
    }

    private selectDefault() {
        if (this.renderedNotes.length == 0) {
            return
        }

        let note = this.renderedNotes[0]
        window.requestAnimationFrame(() => {
            this.select(note.note.path, note.key)
        })
    }

    private renderNote(note: NoteElem) {
        note.render()
        let nextNoteIdx = null
        const match = note.match
        const path = note.note.path

        let rank = Project.instance().sourceView.getRenderedLineRank(path, match.start)
        for (let i = 0; i < this.renderedNotes.length; ++i) {
            let n = this.renderedNotes[i]
            let r = Project.instance().sourceView.getRenderedLineRank(n.note.path, n.match.start)

            if (r > rank) {
                nextNoteIdx = i
                break
            }
        }

        note.update()

        if (nextNoteIdx == null) {
            this.container.appendChild(note.elem)
            this.renderedNotes.push(note)
        } else {
            this.container.insertBefore(note.elem, this.renderedNotes[nextNoteIdx].elem)
            this.renderedNotes.splice(nextNoteIdx, 0, note)
        }

        if (match.start > match.end) {
            return
        }
        for (let i = match.start; i <= match.start; ++i) {
            Project.instance().sourceView.addComment(path, i, note.key)
        }

        if (note.note.codeCollapsed) {
            Project.instance().sourceView.setCollapsedHeader(path, match.start, true)
            for (let i = match.start + 1; i <= match.end; ++i) {
                Project.instance().sourceView.setCollapsed(path, i, true)
            }
        }
    }

    private addNote(note: Note): NoteElem {
        let match = Project.instance().sourceMatcher.match(note)
        let key = `${this.notesCount}`
        let elem = new NoteElem(key, note, match,
            this.onNoteClick,
            this.onUpdate,
            this.onCollapseCode)

        this.notesCount++
        if (!(note.path in this.notes)) {
            this.notes[note.path] = {}
        }
        this.notes[note.path][key] = elem

        return elem
    }

    load(notes: { [path: string]: { [key: string]: any }[] }) {
        this.notes = {}
        this.notesCount = 0
        this.selected = null
        this.container.innerHTML = ''

        for (let path in notes) {
            for (let n of notes[path]) {
                let note = new Note(path, n)
                this.addNote(note)
            }
        }
    }

    private removeAll() {
        for (const n of this.renderedNotes) {
            n.remove()
        }

        this.renderedNotes = []
        this.selected = null
    }

    selectFile(path: string) {
        this.selectedFile = path
        this.searchTerm = null
        this.removeAll()
        let notes = this.notes[path]

        for (const k in notes) {
            this.renderNote(notes[k])
        }
        this.selectDefault()
    }

    selectLines(selectedLines: { [path: string]: { [lineNo: number]: boolean } }) {
        this.searchTerm = null
        this.selectedFile = null
        let selected: NoteElem[] = []
        for (let path in selectedLines) {
            let notes = this.notes[path]
            let lines = selectedLines[path]
            for (let key in notes) {
                let note = notes[key]
                if(lines[note.match.start]) {
                    selected.push(note)
                }
            }
        }

        for (const note of selected) {
            Project.instance().sourceView.selectLines(note.note.path,
                note.match.start - 3, note.match.end + 3)
        }

        Project.instance().sourceView.renderSelectedLines()

        this.removeAll()
        for (const note of selected) {
            this.renderNote(note)
        }

        this.selectDefault()
    }

    private onNoteClick = (path: string, key: string) => {
        const note = this.notes[path][key]
        if (this.selected === note) {
            this.clearSelected()
        } else {
            let y = note.elem.getBoundingClientRect().top
            let lineNo = this.select(path, key)
            if (lineNo != null) {
                Project.instance().sourceView.scroll(path, lineNo, y)
            }
        }
    }

    private create(path: string, text: string, start: number, end: number, opt: {}) {
        let pre: string[] = []
        let code: string[] = []
        let post: string[] = []

        for (let i = -PADDING; i < 0; ++i) {
            let line = Project.instance().sourceView.getCode(path, start + i)
            if (line != null) {
                pre.push(line.code)
            }
        }
        for (let i = start; i <= end; ++i) {
            code.push(Project.instance().sourceView.getCode(path, i).code)
        }
        for (let i = 1; i <= PADDING; ++i) {
            let line = Project.instance().sourceView.getCode(path, end + i)
            if (line != null) {
                post.push(line.code)
            }
        }

        let note = Note.create(path, pre, post, code, text, opt)
        let noteElem = this.addNote(note)
        this.renderNote(noteElem)

        return noteElem
    }

    private onUpdate = (note: NoteElem, isSaveOnly: boolean, start: number, end: number, content: string) => {
        if (!isSaveOnly) {
            if (this.selected === note) {
                this.clearSelected()
            }
            this.remove(note)
            if (content != null && content.trim() != '') {
                let newNote = this.create(note.note.path, content, start, end,
                    note.note.toJSON())
                this.select(newNote.note.path, newNote.key)
            }
        }

        Project.instance().updateNotes(note.note.path, this.toJSON())
    }

    private onCollapseCode = (path: string, key: string) => {
        let note = this.notes[path][key]
        let match = note.match
        if (note.note.codeCollapsed) {
            Project.instance().sourceView.setCollapsedHeader(note.note.path, match.start, true)
            for (let i = match.start + 1; i <= match.end; ++i) {
                Project.instance().sourceView.setCollapsed(note.note.path, i, true)
            }
        } else {
            Project.instance().sourceView.setCollapsedHeader(note.note.path, match.start, false)
            for (let i = match.start + 1; i <= match.end; ++i) {
                Project.instance().sourceView.setCollapsed(note.note.path, i, false)
            }
        }

        Project.instance().updateNotes(note.note.path, this.toJSON())
    }

    remove(note: NoteElem) {
        if (!note.isRendered()) {
            return
        }

        let path = note.note.path
        delete this.notes[path][note.key]
        note.remove()
        for (let i = 0; i < this.renderedNotes.length; ++i) {
            if (this.renderedNotes[i] === note) {
                this.renderedNotes.splice(i, 1)
                break
            }
        }

        let match = note.match
        if (match.start > match.end) {
            return
        }

        for (let i = match.start; i <= match.start; ++i) {
            Project.instance().sourceView.removeComment(path, i, note.key)
        }

        if (note.note.codeCollapsed) {
            Project.instance().sourceView.setCollapsedHeader(path, match.start, false)
            for (let i = match.start + 1; i <= match.end; ++i) {
                Project.instance().sourceView.setCollapsed(path, i, false)
            }
        }
    }

    newNote(path: string, start: number, end: number) {
        let noteElem = this.create(path, '', start, end, {})
        this.select(path, noteElem.key)
        noteElem.edit()
    }

    setNoteLines(path: string, start: number, end: number) {
        if (!this.selected) {
            return false
        }

        let selected = this.selected
        return selected.setNoteLines(path, start, end)
    }

    moveToLine(path: string, lineNo: number) {
        for (let k in Project.instance().sourceView.getCommentKeys(path, lineNo)) {
            this.select(path, k)
            break
        }
    }

    clearSelected() {
        if (this.selected) {
            let oldNote = this.notes[this.selected.note.path][this.selected.key]
            oldNote.unselect()
            for (let i = oldNote.match.start; i <= oldNote.match.end; ++i) {
                Project.instance().sourceView.setSelected(this.selected.note.path, i, false)
            }
            this.selected = null
            if (oldNote.note.note.trim() == '') {
                this.remove(oldNote)
            }
        }
    }

    private resetTransforms() {
        for (let note of this.renderedNotes) {
            note.resetTransform()
        }
    }

    private getAlignmentTransform(note: NoteElem) {
        if (note.match.start > note.match.end) {
            return 0.
        }

        let start = note.match.start
        // let isFirst = this.renderedNotes[0] === note && this.selected == note
        let isFirst = this.renderedNotes[0] === this.selected
        let path = note.note.path

        let y = Project.instance().sourceView.getY(path, start)

        let yn = note.getY()

        let transform = y - yn
        if (isFirst)
            transform -= MARGIN_FIRST
        else
            transform -= MARGIN_OTHER

        return transform
    }

    private align(note: NoteElem) {
        let transform = this.getAlignmentTransform(note)
        note.setTransform(transform)

        let idx = this.renderedNotes.length
        for (let i = 0; i < this.renderedNotes.length; ++i) {
            if (this.renderedNotes[i] == note) {
                idx = i
                break
            }
        }

        let prev = transform;
        for (let i = idx - 1; i >= 0; --i) {
            let n = this.renderedNotes[i]
            let t = this.getAlignmentTransform(n)
            t = Math.min(prev, t)
            n.setTransform(t)
            prev = t
        }

        prev = transform
        for (let i = idx + 1; i < this.renderedNotes.length; ++i) {
            let n = this.renderedNotes[i]
            let t = this.getAlignmentTransform(n)
            t = Math.max(prev, t)
            n.setTransform(t)
            prev = t
        }
    }

    select(path: string, key: string) {
        this.clearSelected()

        let note = this.notes[path][key]
        note.select()
        for (let i = note.match.start; i <= note.match.end; ++i) {
            Project.instance().sourceView.setSelected(path, i, true)
        }
        this.selected = note
        this.resetTransforms()

        window.requestAnimationFrame(() => {
            this.align(note)
            // let transform = this.getAlignmentTransform(note)
            // note.setTransform(transform)
            // this.container.style.transform = `translateY(${transform}px)`
        })

        if (note.match.start > note.match.end) {
            return null
        }
        return note.match.start
    }

    toJSON(): { [path: string]: { [key: string]: any }[] } {
        let allNotes = {}
        for (let path in this.notes) {
            let json = []
            for (let k in this.notes[path]) {
                let n = this.notes[path][k]
                json.push(n.note.toJSON())
            }
            allNotes[path] = json
        }

        return allNotes
    }
}

export { Notes }