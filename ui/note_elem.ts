import { MathJax, MarkDown } from "./markdown"
import { NoteMatch } from "./source_code"
import { Note } from "./note"
import { createIcon } from "./util"

interface NoteClickListener {
    (path: string, key: string): void
}

interface NoteListener {
    (): void
}

interface NoteUpdateListener {
    (noteElem: NoteElem, isSaveOnly: boolean, start: number, end: number, content: string): void
}


class NoteEditElem {
    elem: HTMLDivElement
    button: HTMLButtonElement
    start: HTMLInputElement
    end: HTMLInputElement
    textArea: HTMLTextAreaElement

    constructor(saveListener: NoteListener) {
        this.elem = document.createElement('div')
        this.elem.className = 'edit'

        this.start = document.createElement('input')
        this.start.setAttribute('type', 'number')
        this.elem.appendChild(this.start)

        this.end = document.createElement('input')
        this.end.setAttribute('type', 'number')
        this.elem.appendChild(this.end)

        this.textArea = document.createElement('textarea')
        this.elem.appendChild(this.textArea)

        this.button = document.createElement('button')
        this.button.textContent = 'Save'
        this.elem.appendChild(this.button)

        this.button.addEventListener('click', saveListener)
    }

    focusEdit() {
        this.textArea.focus()
    }

    setContent(text: string, match: NoteMatch) {
        this.textArea.value = text
        this.start.value = `${match.start + 1}`
        this.end.value = `${match.end + 1}`
    }

    getContent() {
        return this.textArea.value
    }

    getStart() {
        return parseInt(this.start.value) - 1
    }

    getEnd() {
        return parseInt(this.end.value) - 1
    }

    setStart(lineNo: number) {
        return this.start.value = `${lineNo + 1}`
    }

    setEnd(lineNo: number) {
        return this.end.value = `${lineNo + 1}`
    }
}

class NoteViewControls {
    elem: HTMLDivElement
    edit: HTMLElement
    collapse: HTMLElement
    codeCollapse: HTMLElement
    remove: HTMLElement

    constructor(editListener: NoteListener,
        removeListener: NoteListener,
        collapseListener: NoteListener,
        codeCollapseListener: NoteListener) {
        this.elem = document.createElement('div')
        this.elem.className = 'view_controls'

        this.collapse = createIcon('compress-arrows-alt')
        this.collapse.classList.add('collapse_note')
        this.elem.appendChild(this.collapse)
        this.collapse.addEventListener('click', collapseListener)

        this.codeCollapse = createIcon('minus-square')
        this.codeCollapse.classList.add('collapse_code')
        this.elem.appendChild(this.codeCollapse)
        this.codeCollapse.addEventListener('click', codeCollapseListener)

        this.edit = createIcon('edit')
        this.edit.classList.add('edit_button')
        this.elem.appendChild(this.edit)

        this.edit.addEventListener('click', editListener)

        this.remove = createIcon('trash')
        this.remove.classList.add('remove_button')
        this.elem.appendChild(this.remove)

        this.remove.addEventListener('click', removeListener)
    }
}


class NoteElem {
    note: Note
    match: NoteMatch
    elem: HTMLDivElement
    view: HTMLDivElement
    viewControls: NoteViewControls
    editElem: NoteEditElem
    key: string
    clickListener: NoteClickListener
    updateListener: NoteUpdateListener
    collapseListener: NoteClickListener

    constructor(key: string, note: Note, match: NoteMatch,
        clickListener: NoteClickListener,
        updateListener: NoteUpdateListener,
        collapseListener: NoteClickListener) {
        this.key = key
        this.note = note
        this.match = match

        this.clickListener = clickListener
        this.updateListener = updateListener
        this.collapseListener = collapseListener

        this.elem = null
    }

    render() {
        this.elem = document.createElement('div')
        this.elem.classList.add("note")

        this.view = document.createElement('div')
        this.viewControls = new NoteViewControls(this.onEdit,
            this.onRemove,
            this.onCollapse,
            this.onCodeCollapse)
        this.elem.appendChild(this.view)
        this.elem.appendChild(this.viewControls.elem)
        this.view.className = 'view'

        this.editElem = new NoteEditElem(this.onSave)
        this.elem.appendChild(this.editElem.elem)

        this.view.addEventListener('click', this.onClick)
        this.setCollapseCss()
    }

    isRendered(): boolean {
        return this.elem !== null
    }

    isEditing(): boolean {
        if (!this.isRendered()) {
            return false
        }

        return this.elem.classList.contains('editing')
    }

    private onCodeCollapse = () => {
        this.note.codeCollapsed = !this.note.codeCollapsed
        this.collapseListener(this.note.path, this.key)
    }

    private onCollapse = () => {
        this.note.collapsed = !this.note.collapsed
        this.setCollapseCss()
        this.updateListener(this, true, null, null, null)
    }

    private setCollapseCss() {
        if (this.note.collapsed) {
            this.elem.classList.add('collapsed')
        } else {
            this.elem.classList.remove('collapsed')
        }
    }

    private onEdit = () => {
        this.edit()
    }

    private onRemove = () => {
        this.updateListener(this, false, null, null, null)
    }

    resetTransform() {
        this.elem.style.transform = null
    }

    setTransform(y: number) {
        this.elem.style.transform = `translateY(${y}px)`
    }

    edit() {
        this.elem.classList.add('editing')
        this.editElem.setContent(this.note.note, this.match)
        this.editElem.focusEdit()
    }

    private onSave = () => {
        let start = this.editElem.getStart()
        let end = this.editElem.getEnd()
        let content = this.editElem.getContent()

        this.updateListener(this, false, start, end, content)
    }

    update() {
        const html = MarkDown.render(this.note.note)
        this.view.innerHTML = html
        let scripts = this.view.getElementsByTagName('script')
        for (let i = 0; i <scripts.length; ++i) {
            let s = scripts[i]
            s.innerText = s.innerHTML.replace(/&amp;/g, '&')
        }
        window.requestAnimationFrame(() =>
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, this.view])
        )
    }

    remove() {
        this.elem.parentElement.removeChild(this.elem)
        this.elem = null
    }

    getY() {
        return this.elem.offsetTop
    }

    select() {
        this.elem.classList.add("selected")
    }

    unselect() {
        this.elem.classList.remove('editing')
        this.elem.classList.remove("selected")
    }

    setNoteLines(path: string, start: number, end: number) {
        if (this.note.path != path) {
            return false
        }
        if (!this.isEditing()) {
            return false
        }

        this.editElem.setStart(start)
        this.editElem.setEnd(end)

        return true
    }

    private onClick = () => {
        this.clickListener(this.note.path, this.key)
    }
}

export { NoteElem, NoteClickListener }