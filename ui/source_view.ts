import {LineElem, LineClickListener, NoteAddListener} from "./line"
import { getLanguage } from "./util";

class SourceView {
    renderedLines: LineElem[]
    allLines: {[path: string]: LineElem[]}
    selected_file: string
    lineClickListener: LineClickListener;
    noteAddListener: NoteAddListener;
    container: HTMLElement;
    userSelection?: any

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
            console.log('down', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'start');
        });
        this.container.addEventListener('mousemove', (ev) => {
            // console.log('move', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'move');
        });
        this.container.addEventListener('mouseup', (ev) => {
            console.log('up', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'end');
        });
        this.container.addEventListener('mouseleave', (ev) => {
            console.log('leave', ev.pageX, ev.pageY, ev);
            this.onUserSelect(ev.pageX, ev.pageY, 'leave');
        });
    }

    private removeAll() {
        for(let line of this.renderedLines) {
            line.remove();
        }
        this.renderedLines = [];
    }

    selectFile(path: string) {
        this.selected_file = path;
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

        console.log(x, y);

        let height = line.elem.getBoundingClientRect().height;
        let margin = line.codeElem.getBoundingClientRect().left -
                     this.container.getBoundingClientRect().left;

        console.log(height, margin);

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
                this.noteAddListener(this.selected_file, f, t)
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

    addComment(path: string, lineNo: number) {
        this.allLines[path][lineNo].addComment();
    }

    removeComment(path: string, lineNo: number) {
        this.allLines[path][lineNo].removeComment();
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