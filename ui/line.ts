import {Weya as $, WeyaElement} from "../lib/weya/weya"
import {Project} from "./project"

interface LineClickListener {
    (path: string, lineNo: number): void
}

interface NoteAddListener {
    (path: string, start: number, end: number): void
}

class LineElem {
    path: string
    lineNo: number
    code: string
    language: string

    elem?: HTMLDivElement
    lineNoElem: WeyaElement
    codeElem: HTMLElement
    addCommentIcon: WeyaElement
    hasComments: WeyaElement
    hasCommentsMany: WeyaElement
    clickListener: LineClickListener
    addListener: NoteAddListener

    comments: number
    collapsedHeader: number
    collapsed: number

    userSelected: boolean
    rank: number
    isShowPath: boolean
    isShowBreakBefore: boolean
    private readonly commentKeys: Set<string>
    highlighted: string

    constructor(path: string, lineNo: number, code: string, highlighted: string, language: string, clickListener: LineClickListener, addListener: NoteAddListener) {
        this.path = path
        this.lineNo = lineNo
        this.code = code
        this.highlighted = highlighted
        this.language = language

        this.comments = 0
        this.collapsed = 0
        this.collapsedHeader = 0

        this.clickListener = clickListener
        this.addListener = addListener

        this.userSelected = false
        this.elem = null
        this.rank = 0
        this.isShowBreakBefore = false
        this.isShowPath = false
        this.commentKeys = new Set()
    }


    render(rank: number) {
        this.rank = rank
        this.elem = <HTMLDivElement>$('div.line', $ => {
            if (this.isShowPath) {
                $('div.path', this.path, {on: {'click': this.onSelectFile}})
            }
            if (this.isShowBreakBefore) {
                $('div', '...', {})
            }
            this.isShowBreakBefore = false
            this.isShowPath = false

            this.addCommentIcon = $('i.fas.fa-plus.add_comment', {on: {'click': this.onAddCommentClick}})

            this.hasComments = $('i.fas.fa-comment.has_comments')
            this.hasCommentsMany = $('i.fas.fa-comments.has_comments_many')

            this.lineNoElem = $('span.line_no', `${this.lineNo + 1}`)
        })

        this.codeElem = document.createElement("span")

        if (this.code.trim() !== "") {
            // let h = highlight(this.language, this.code, true, null)
            this.codeElem.innerHTML = this.highlighted
            this.elem.appendChild(this.codeElem)
        }

        this.codeElem.addEventListener('click', this.onLineClick)
        this.hasComments.addEventListener('click', this.onLineClick)
        this.hasCommentsMany.addEventListener('click', this.onLineClick)

        this.setCommentsCss()
        this.setCollapsedCss()
        this.setCollapsedHeaderCss()
    }

    onSelectFile = () => {
        Project.instance().selectFile(this.path)
    }

    isRendered() {
        return this.elem !== null
    }

    remove() {
        this.elem.parentElement.removeChild(this.elem)
        this.elem = null
    }

    showPath() {
        this.isShowPath = true
    }

    showBreakBefore() {
        this.isShowBreakBefore = true
    }

    private onAddCommentClick = () => {
        this.addListener(this.path, this.lineNo, this.lineNo)
    }

    private onLineClick = () => {
        console.log('click')
        this.clickListener(this.path, this.lineNo)
    }

    private setCommentsCss() {
        if (this.comments == 0) {
            this.elem.classList.remove("commented")
            this.elem.classList.remove("commented_many")
        } else if (this.comments === 1) {
            this.elem.classList.add("commented")
            this.elem.classList.remove("commented_many")
        } else {
            this.elem.classList.add("commented_many")
        }
    }

    addComment(key: string) {
        if (!this.commentKeys.has(key)) {
            this.commentKeys.add(key)
            this.comments++
        }
        this.setCommentsCss()
    }

    removeComment(key: string) {
        if (this.commentKeys.has(key)) {
            this.commentKeys.delete(key)
            this.comments--
        }
        this.setCommentsCss()
    }

    getCommentKeys() {
        return this.commentKeys
    }

    private setCollapsedHeaderCss() {
        if (this.collapsedHeader === 0)
            this.elem.classList.remove('collapsed_header')
        else
            this.elem.classList.add('collapsed_header')
    }

    setCollapsedHeader(isHeader: boolean) {
        if (isHeader)
            this.collapsedHeader++
        else
            this.collapsedHeader--

        this.setCollapsedHeaderCss()
    }

    private setCollapsedCss() {
        if (this.collapsed === 0)
            this.elem.classList.remove('collapsed')
        else
            this.elem.classList.add('collapsed')
    }

    setCollapsed(isCollapsed: boolean) {
        if (isCollapsed)
            this.collapsed++
        else
            this.collapsed--

        this.setCollapsedCss()
    }

    clear() {
        this.elem.classList.remove("commented")
        this.elem.classList.remove("commented_many")
        this.comments = 0
        this.elem.classList.remove("selected")
    }

    get isSelected(): boolean {
        return this.elem.classList.contains('selected')
    }

    setSelected(isSelected: boolean) {
        if (isSelected) {
            this.elem.classList.add("selected")
        } else {
            this.elem.classList.remove("selected")
        }
    }

    getY() {
        return this.elem.offsetTop
    }

    userSelect(selected: boolean) {
        if (selected == this.userSelected)
            return

        this.userSelected = selected
        if (selected) {
            this.elem.classList.add('user_selected')
        } else {
            this.elem.classList.remove('user_selected')
        }
    }
}

export {LineElem, LineClickListener, NoteAddListener}