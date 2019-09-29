import {LineElem, LineClickListener, NoteAddListener} from "./line"
import { getLanguage } from "./util";

class SourceView {
    renderedLines: LineElem[]
    allLines: {[path: string]: LineElem[]}
    selectedFile: string
    lineClickListener: LineClickListener;
    noteAddListener: NoteAddListener;
    container: HTMLElement;
    userSelection?: any
    selectedLines: {[path: string]: {[lineNo: number]: boolean}};

    constructor(container: HTMLElement, lineClickListener: LineClickListener, noteAddListener: NoteAddListener) {
        this.allLines = {};
        this.renderedLines = [];
        this.container = container;
        this.lineClickListener = lineClickListener;
        this.noteAddListener = noteAddListener;

        this.setEvents();
    }

    private setEvents() {
        this.container.addEventListener('mousedown', (ev) => {
            // console.log('down', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'start');
        });
        this.container.addEventListener('mousemove', (ev) => {
            // console.log('move', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'move');
        });
        this.container.addEventListener('mouseup', (ev) => {
            // console.log('up', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'end');
        });
        this.container.addEventListener('mouseleave', (ev) => {
            // console.log('leave', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'leave');
        });
    }

    private removeAll() {
        for(let line of this.renderedLines) {
            line.remove();
        }
        this.renderedLines = [];
    }

    search() {
        this.selectedFile = null;
        this.selectedLines = {};
        this.removeAll();
    }

    selectLines(path: string, start: number, end: number) {
        let lines = this.allLines[path];

        start = Math.max(0, start);
        end = Math.min(lines.length - 1, end);

        if(this.selectedLines[path] == null) {
            this.selectedLines[path] = {};

        } 
        for(let i = start; i < end; ++i) {
            this.selectedLines[path][i] = true;
        }
    }

    renderSelectedLines() {
        for(let path in this.selectedLines) {
            let lineNos: number[] = [];
            for(let lineNo in this.selectedLines[path]) {
                lineNos.push(parseInt(lineNo));
            }

            lineNos.sort((x, y) => {return x - y});
            let prev: number = null;

            for(let lineNo of lineNos.slice(1)) {
                let line = this.allLines[path][lineNo];
                if(prev == null) {
                    line.showPath();
                } else if (prev !== lineNo - 1) {
                    line.showBreakBefore();
                }
                prev = lineNo;
                line.render(this.renderedLines.length);
                this.renderedLines.push(line);
                this.container.appendChild(line.elem);
            }
        }
    }

    selectFile(path: string) {
        this.selectedFile = path;
        this.removeAll();
        let lines = this.allLines[path];

        for(let i = 0; i < lines.length; ++i) {
            const elem = lines[i];
            elem.render(i);
            this.renderedLines.push(elem);
            this.container.appendChild(elem.elem);
        }
    }

    load(files: {[path: string]: string[]}) {
        for(let path in files) {
            const lines = files[path];
            this.allLines[path] = [];
            const language = getLanguage(path);
            for(let i = 0; i < lines.length; ++i) {
                let elem = new LineElem(path, i, lines[i], language, 
                    this.lineClickListener,
                    this.noteAddListener);
                this.allLines[path].push(elem);
            }    
        }
    }
    
    getRenderedLineRank(path: string, lineNo: number): number {
        return this.allLines[path][lineNo].rank;
    }

    onUserSelect(x: number, y: number, event: string) {
        if(this.renderedLines.length == 0) 
            return;

        x -= this.container.getBoundingClientRect().left;
        y -= this.container.getBoundingClientRect().top;

        let line = this.renderedLines[0];

        // console.log(x, y);

        let height = line.elem.getBoundingClientRect().height;
        let margin = line.codeElem.getBoundingClientRect().left -
                     this.container.getBoundingClientRect().left;

        // console.log(height, margin);

        let lineNo = Math.floor(y / height);

        if(event == 'start') {
            if(x >= margin) {
                this.clearUserSelection();
                return;
            }

            this.userSelection = {
                start: lineNo,
                end: lineNo
            };

            this.markUserSelection();
        } else if(event == 'move') {
            if(this.userSelection == null)
                return;
            this.userSelection.end = lineNo;
            this.markUserSelection();
        } else if(event == 'leave') {
            if(this.userSelection == null)
                return;
            this.clearUserSelection();
        } else {
            if(this.userSelection == null)
                return;
            let f = Math.min(this.userSelection.start, this.userSelection.end);
            let t = Math.max(this.userSelection.start, this.userSelection.end);
            if(f != t) {
                this.noteAddListener(this.selectedFile, f, t)
            }
            this.clearUserSelection();
        }
    }

    markUserSelection() {
        for(let l of this.renderedLines) {
            l.userSelect(false);
        }

        if(this.userSelection == null)
            return;

        let f = Math.min(this.userSelection.start, this.userSelection.end);
        let t = Math.max(this.userSelection.start, this.userSelection.end);
        for(let i = f; i <= t; ++i) {
            this.renderedLines[i].userSelect(true);
        }
    }

    clearUserSelection() {
        this.userSelection = null;
        this.markUserSelection();
    }

    addComment(path: string, lineNo: number, key: string) {
        this.allLines[path][lineNo].addComment(key);
    }

    removeComment(path: string, lineNo: number, key: string) {
        this.allLines[path][lineNo].removeComment(key);
    }

    getCommentKeys(path: string, lineNo: number): {[key: string]: boolean} {
        return this.allLines[path][lineNo].getCommentKeys();
    }

    setCollapsedHeader(path: string, lineNo: number, isHeader: boolean) {
        this.allLines[path][lineNo].setCollapsedHeader(isHeader)
    }

    setCollapsed(path: string, lineNo: number, isCollapsed: boolean) {
        this.allLines[path][lineNo].setCollapsed(isCollapsed)
    }

    setSelected(path: string, lineNo: number, isSelected: boolean) {
        this.allLines[path][lineNo].setSelected(isSelected);
    }

    getY(path: string, lineNo: number) {
        return this.allLines[path][lineNo].getY();
    }

    scroll(path: string, lineNo: number, offset: number) {
        const line = this.allLines[path][lineNo];
        if(!line.isRendered()) {
            return;
        }

        let node = this.container;
        let containerOffset = 0;
        while(node != null) {
            containerOffset += node.offsetTop;
            node = node.parentElement;
        }
        window.scroll(0, line.getY() + containerOffset - Math.round(offset));
    }

    getCode(path: string, lineNo: number) {
        let lines = this.allLines[path];

        if(lineNo < 0 || lineNo >= lines.length) {
            return null;
        }

        return lines[lineNo];
    }
}


export {SourceView}