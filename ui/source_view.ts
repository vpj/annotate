import {LineElem, LineClickListener, NoteAddListener} from "./line"
import {getLanguage} from "./util"
import {highlight} from "./hljs"
import {Project} from "./project"

class SourceView {
    renderedLines: LineElem[]
    allLines: { [path: string]: LineElem[] }
    selectedFile: string
    lineClickListener: LineClickListener
    noteAddListener: NoteAddListener
    container: HTMLElement
    userSelection?: any
    selectedLines: { [path: string]: { [lineNo: number]: boolean } }
    searchElem: HTMLInputElement
    searchTerm: string

    constructor(container: HTMLElement, lineClickListener: LineClickListener, noteAddListener: NoteAddListener) {
        this.allLines = {}
        this.renderedLines = []
        this.container = container
        this.lineClickListener = lineClickListener
        this.noteAddListener = noteAddListener

        this.setEvents()

        this.searchElem = <HTMLInputElement>document.getElementById('code_search')
        this.searchElem.addEventListener('keyup', this.onSearch)
        this.searchElem.addEventListener('change', this.onSearch)
        this.searchElem.addEventListener('paste', this.onSearch)
    }

    private setEvents() {
        this.container.addEventListener('mousedown', (ev) => {
            // console.log('down', ev.pageX, ev.pageY, ev)
            this.onUserSelect(ev.clientX, ev.clientY, 'start')
        })
        this.container.addEventListener('mousemove', (ev) => {
            // console.log('move', ev.pageX, ev.pageY, ev)
            this.onUserSelect(ev.clientX, ev.clientY, 'move')
        })
        this.container.addEventListener('mouseup', (ev) => {
            // console.log('up', ev.pageX, ev.pageY, ev)
            this.onUserSelect(ev.clientX, ev.clientY, 'end')
        })
        this.container.addEventListener('mouseleave', (ev) => {
            // console.log('leave', ev.pageX, ev.pageY, ev)
            this.onUserSelect(ev.clientX, ev.clientY, 'leave')
        })
    }

    private onSearch = () => {
        let search = this.searchElem.value
        if (search === this.searchTerm) {
            return
        }

        Project.instance().searchCode(search)
    }

    search(search: string) {
        this.searchMode()

        for (let path in this.allLines) {
            let lines = this.allLines[path]
            for (let i = 0; i < lines.length; ++i) {
                if (lines[i].code.toLowerCase().indexOf(search) !== -1) {
                    this.selectLines(path, Math.max(0, i - 2), Math.min(lines.length - 1, i + 2))
                }
            }
        }

        // TODO: repeat this until more lines are selected
        Project.instance().notes.selectLines(this.selectedLines)

        // this.renderSelectedLines()
    }

    private removeAll() {
        for (let line of this.renderedLines) {
            line.remove()
        }
        this.renderedLines = []
    }

    searchMode() {
        this.selectedFile = null
        this.selectedLines = {}
        this.removeAll()
    }

    selectLines(path: string, start: number, end: number) {
        let lines = this.allLines[path]

        start = Math.max(0, start)
        end = Math.min(lines.length - 1, end)

        if (this.selectedLines[path] == null) {
            this.selectedLines[path] = {}

        }
        for (let i = start; i < end; ++i) {
            this.selectedLines[path][i] = true
        }
    }

    renderSelectedLines() {
        for (let path in this.selectedLines) {
            let lineNos: number[] = []
            for (let lineNo in this.selectedLines[path]) {
                lineNos.push(parseInt(lineNo))
            }

            lineNos.sort((x, y) => {
                return x - y
            })
            let prev: number = null

            // This was using a lineNos.slice(1), not sure why
            for (let lineNo of lineNos) {
                let line = this.allLines[path][lineNo]
                if (prev == null) {
                    line.showPath()
                } else if (prev !== lineNo - 1) {
                    line.showBreakBefore()
                }
                prev = lineNo
                line.render(this.renderedLines.length)
                this.renderedLines.push(line)
                this.container.appendChild(line.elem)
            }
        }
    }

    selectFile(path: string) {
        this.selectedFile = path
        this.removeAll()
        let lines = this.allLines[path]

        for (let i = 0; i < lines.length; ++i) {
            const elem = lines[i]
            elem.render(i)
            this.renderedLines.push(elem)
            this.container.appendChild(elem.elem)
        }
    }

    load(files: { [path: string]: string[] }) {
        for (let path in files) {
            const lines = files[path]
            this.allLines[path] = []
            const language = getLanguage(path)
            let highlightedLines: string[]
            if (language !== 'text') {
                let h = highlight(language, lines.join("\n"), true, null)
                highlightedLines = h.value.split('\n')
            } else {
                highlightedLines = lines.join('\n').split('\n')
            }
            if (lines.length === 0) {
                highlightedLines = []
            }
            if (highlightedLines.length !== lines.length) {
                throw Error("Highlighting Error")
            }

            let spans = []
            for (let i = 0; i < lines.length; ++i) {
                let h = highlightedLines[i]
                let hu = spans.join('') + h
                let ends = []
                for (let j = 0; j < spans.length; ++j) {
                    ends.push('</span>')
                }
                hu += ends.join('')

                let elem = new LineElem(path, i, lines[i], hu,
                    language,
                    this.lineClickListener,
                    this.onLineNoteAdd)

                let p = 0
                for (let j = 0; true; ++j) {
                    p = h.indexOf('<span', p)
                    if (p === -1) {
                        break
                    }

                    let e = h.indexOf('>')
                    spans.push(h.slice(p, e + 1))
                    p++
                }
                p = 0
                for (let j = 0; true; ++j) {
                    p = h.indexOf('</span', p)
                    if (p === -1) {
                        break
                    }

                    spans.pop()
                    p++
                }

                this.allLines[path].push(elem)
            }
        }
    }

    getRenderedLineRank(path: string, lineNo: number): number {
        if (lineNo > 1e8) {
            return lineNo
        }
        return this.allLines[path][lineNo].rank
    }

    private getLineNo(y: number) {
        let line = this.renderedLines[0]

        // console.log(x, y)

        let height = line.lineNoElem.getBoundingClientRect().height

        // console.log(height, margin)

        for (let i = 0; i < this.renderedLines.length; ++i) {
            let l = this.renderedLines[i]
            if (l.collapsedHeader > 0) {
                y -= l.elem.getBoundingClientRect().height
            } else if (l.collapsed === 0 || l.isSelected) {
                y -= height
            }

            if (y < 0) {
                return i
            }
        }

        return Math.floor(y / height)
    }

    private getMarginLeft(): number {
        return this.renderedLines[0].codeElem.getBoundingClientRect().left -
            this.container.getBoundingClientRect().left
    }

    onUserSelect(x: number, y: number, event: string) {
        if (this.renderedLines.length == 0)
            return

        x -= this.container.getBoundingClientRect().left
        y -= this.container.getBoundingClientRect().top

        // console.log(x, y)
        let margin = this.getMarginLeft()

        let lineNo = this.getLineNo(y)

        if (event == 'start') {
            if (x >= margin) {
                this.clearUserSelection()
                return
            }

            this.userSelection = {
                start: lineNo,
                end: lineNo
            }

            this.markUserSelection()
        } else if (event == 'move') {
            if (this.userSelection == null)
                return
            this.userSelection.end = lineNo
            this.markUserSelection()
        } else if (event == 'leave') {
            if (this.userSelection == null)
                return
            this.clearUserSelection()
        } else {
            if (this.userSelection == null)
                return
            let f = Math.min(this.userSelection.start, this.userSelection.end)
            let t = Math.max(this.userSelection.start, this.userSelection.end)
            if (f != t) {
                this.addNote(this.selectedFile, f, t)
            }
            this.clearUserSelection()
        }
    }

    markUserSelection() {
        for (let l of this.renderedLines) {
            l.userSelect(false)
        }

        if (this.userSelection == null)
            return

        let f = Math.min(this.userSelection.start, this.userSelection.end)
        let t = Math.max(this.userSelection.start, this.userSelection.end)
        for (let i = f; i <= t; ++i) {
            this.renderedLines[i].userSelect(true)
        }
    }

    clearUserSelection() {
        this.userSelection = null
        this.markUserSelection()
    }

    addComment(path: string, lineNo: number, key: string) {
        this.allLines[path][lineNo].addComment(key)
    }

    removeComment(path: string, lineNo: number, key: string) {
        this.allLines[path][lineNo].removeComment(key)
    }

    getCommentKeys(path: string, lineNo: number): Set<string> {
        return this.allLines[path][lineNo].getCommentKeys()
    }

    setCollapsedHeader(path: string, lineNo: number, isHeader: boolean) {
        this.allLines[path][lineNo].setCollapsedHeader(isHeader)
    }

    setCollapsed(path: string, lineNo: number, isCollapsed: boolean) {
        this.allLines[path][lineNo].setCollapsed(isCollapsed)
    }

    setSelected(path: string, lineNo: number, isSelected: boolean) {
        this.allLines[path][lineNo].setSelected(isSelected)
    }

    getY(path: string, lineNo: number) {
        return this.allLines[path][lineNo].getY()
    }

    scroll(path: string, lineNo: number, offset: number) {
        const line = this.allLines[path][lineNo]
        if (!line.isRendered()) {
            return
        }

        let node = this.container
        let containerOffset = 0
        while (node != null) {
            containerOffset += node.offsetTop
            node = <HTMLElement>node.offsetParent
        }
        let scroll = line.getY() + containerOffset - Math.round(offset)
        window.scroll(0, scroll)
    }

    addNote(path: string, start: number, end: number) {
        let s = window.scrollY
        this.noteAddListener(path, start, end)
        window.scroll(0, s)
        console.log('scrolled', s, window.scrollY)
    }

    onLineNoteAdd = (path: string, start: number, end: number) => {
        this.addNote(path, start, end)
    }

    getCode(path: string, lineNo: number) {
        let lines = this.allLines[path]

        if (lineNo < 0 || lineNo >= lines.length) {
            return null
        }

        return lines[lineNo]
    }
}


export {SourceView}