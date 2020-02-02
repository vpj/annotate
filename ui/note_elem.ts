import {MathJax, MarkDown} from "./markdown"
import {NoteMatch} from "./source_code"
import {Note} from "./note"
import {createIcon} from "./util"
import {Weya as $, WeyaElement, WeyaElementFunction} from './weya/weya'

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
        this.elem = <HTMLDivElement>$('div.edit', $ => {
                this.start = <HTMLInputElement>$('input', {type: 'number'})
                this.end = <HTMLInputElement>$('input', {type: 'number'})

                this.textArea = <HTMLTextAreaElement>$('textarea')

                this.button = <HTMLButtonElement>$('button', 'Save', {on: {click: saveListener}})
            }
        )

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

    constructor(editListener: NoteListener,
                removeListener: NoteListener,
                collapseListener: NoteListener,
                codeCollapseListener: NoteListener,
                viewCodeListener: NoteListener) {
        this.elem = <HTMLDivElement>$('div.view_controls', $ => {
            $('i.fa.fa-compress-arrows-alt',
                {on: {click: collapseListener}})

            $('i.fa.fa-expand-arrows-alt',
                {on: {click: collapseListener}})

            $('i.fa.fa-minus-square',
                {on: {click: codeCollapseListener}})

            $('i.fa.fa-plus-square',
                {on: {click: codeCollapseListener}})

            $('i.fa.fa-code',
                {on: {click: viewCodeListener}})

            $('i.fa.fa-edit',
                {on: {click: editListener}})

            $('i.fa.fa-trash',
                {on: {click: removeListener}})
        })
    }
}

class CodeElem {
    elem: HTMLDivElement
    button: HTMLButtonElement
    start: HTMLInputElement
    end: HTMLInputElement
    textArea: HTMLTextAreaElement

    constructor(note: Note) {
        this.elem = <HTMLDivElement>$('div.node_code', $ => {
            $('pre', $ => {
                this.createLines($, '.pre', note.pre)
                this.createLines($, '.note_code', note.code)
                this.createLines($, '.post', note.post)
            })
        })
    }

    private createLines($: WeyaElementFunction, className: string, lines: string[]) {
        $(`div${className}`, $ => {
            for (let line of lines) {
                line = line === '' ? ' ' : line
                $('div.line', line)
            }

        })
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
    private codeElem: CodeElem

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
        this.elem = <HTMLDivElement>$('div.note', $ => {
            this.view = <HTMLDivElement>$('div.view')
        })

        this.viewControls = new NoteViewControls(this.onEdit,
            this.onRemove,
            this.onCollapse,
            this.onCodeCollapse,
            this.onViewCode)

        this.elem.appendChild(this.viewControls.elem)

        this.editElem = new NoteEditElem(this.onSave)
        this.elem.appendChild(this.editElem.elem)

        this.codeElem = new CodeElem((this.note))
        this.elem.appendChild((this.codeElem.elem))

        this.view.addEventListener('click', this.onClick)
        this.setCollapseCss()
        this.setCodeCollapseCss()
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

    get isViewCode(): boolean {
        return this.elem.classList.contains('viewing_code')
    }

    private onViewCode = () => {
        if (!this.isViewCode) {
            this.elem.classList.add('viewing_code')
        } else {
            this.elem.classList.remove('viewing_code')
        }
    }

    private onCodeCollapse = () => {
        this.note.codeCollapsed = !this.note.codeCollapsed
        this.setCodeCollapseCss()
        this.collapseListener(this.note.path, this.key)
    }

    private onCollapse = () => {
        this.note.collapsed = !this.note.collapsed
        this.setCollapseCss()
        this.updateListener(this, true, null, null, null)
    }

    private setCollapseCss() {
        if (this.note.collapsed) {
            this.elem.classList.remove('editing')
            this.elem.classList.add('collapsed')
        } else {
            this.elem.classList.remove('collapsed')
        }
    }

    private setCodeCollapseCss() {
        if (this.note.codeCollapsed) {
            this.elem.classList.remove('editing')
            this.elem.classList.add('code_collapsed')
        } else {
            this.elem.classList.remove('code_collapsed')
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
        this.elem.classList.remove('viewing_code')
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
        for (let i = 0; i < scripts.length; ++i) {
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
        this.elem.classList.remove('viewing_code')
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

export {NoteElem, NoteClickListener}