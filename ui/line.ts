import {highlight} from "./hljs"
import {createIcon} from "./util";

interface LineClickListener {
    (lineNo: number): void
}


class Line {
    lineNo: number
    code: string

    constructor(lineNo: number, code: string) {
        this.lineNo = lineNo;
        this.code = code;
    }
}

class LineElem {
    line: Line;
    elem: HTMLDivElement;
    lineNoElem: HTMLSpanElement;
    codeElem: HTMLSpanElement;
    addComment: HTMLElement;
    hasComments: HTMLElement;
    hasCommentsMany: HTMLElement;
    clickListener: LineClickListener;
    addListener: LineClickListener;
    comments: number;
    collapsedHeader: number;
    collapsed: number;
    language: string;

    constructor(line: Line, language: string, clickListener: LineClickListener, addListener: LineClickListener) {
        this.comments = 0;
        this.collapsed = 0;
        this.collapsedHeader = 0;
        
        this.line = line;
        this.elem = document.createElement('div');
        this.elem.className = "line";
        this.clickListener = clickListener;
        this.addListener = addListener;
        this.language = language;
    }

    render() {
        this.addComment = createIcon('plus');
        this.addComment.classList.add('add_comment');
        this.elem.appendChild(this.addComment);
        this.addComment.addEventListener('click', this.onAddCommentClick.bind(this));

        this.hasComments = createIcon('comment');
        this.hasComments.classList.add('has_comments');
        this.elem.appendChild(this.hasComments);
        this.hasCommentsMany = createIcon('comments');
        this.hasCommentsMany.classList.add('has_comments_many');
        this.elem.appendChild(this.hasCommentsMany);

        this.lineNoElem = document.createElement('span');
        this.codeElem = document.createElement("span");
    
        this.lineNoElem.className = "line_no";
        this.lineNoElem.textContent = `${this.line.lineNo + 1}`;
        this.elem.appendChild(this.lineNoElem);
    
        if(this.line.code.trim() !== "") {
            let h = highlight(this.language, this.line.code, true, null);
            this.codeElem.innerHTML = h.value;
            this.elem.appendChild(this.codeElem);
        }

        this.codeElem.addEventListener('click', this.onLineClick.bind(this));
        this.hasComments.addEventListener('click', this.onLineClick.bind(this));
        this.hasCommentsMany.addEventListener('click', this.onLineClick.bind(this));
    }

    private onAddCommentClick() {
        if(this.addListener != null) {
            this.addListener(this.line.lineNo);
        }
    }

    private onLineClick() {
        if(this.clickListener != null) {
            this.clickListener(this.line.lineNo);
        }
    }

    hasComment() {
        if(this.comments === 0) {
            this.elem.classList.add("commented");
        } else {
            this.elem.classList.add("commented_many");
        }
        this.comments++;
    }

    noComment() {
        if(this.comments === 1) {
            this.elem.classList.remove("commented");
        } else {
            this.elem.classList.remove("commented_many");
        }
        this.comments--;
    }

    isCollapsedHeader() {
        this.elem.classList.add('collapsed_header')
        this.collapsedHeader++;
    }

    noCollapsedHeader() {
        if(this.collapsedHeader == 1)
            this.elem.classList.remove('collapsed_header')
        this.collapsedHeader--;
    }

    isCollapsed() {
        this.elem.classList.add('collapsed')
        this.collapsed++;
    }

    noCollapsed() {
        if(this.collapsed == 1)
            this.elem.classList.remove('collapsed')
        this.collapsed--;
    }

    clear() {
        this.elem.classList.remove("commented");
        this.elem.classList.remove("commented_many");
        this.comments = 0;
        this.elem.classList.remove("selected");
    }

    select() {
        this.elem.classList.add("selected");
    }

    unselect() {
        this.elem.classList.remove("selected");
    }

    getY() {
        return this.elem.offsetTop;
    }
}

class Lines {
    lines: LineElem[]
    container: HTMLElement;
    lineClickListener: LineClickListener;
    noteAddListener: LineClickListener;

    constructor(container: HTMLElement, lineClickListener: LineClickListener,
        noteAddListener: LineClickListener) {
        this.lines = [];
        this.container = container;
        this.lineClickListener = lineClickListener;
        this.noteAddListener = noteAddListener;
    }

    load(lines: string[], language: string) {
        this.lines = [];
        this.container.innerHTML = '';
        for(let l of lines) {
            this.add(l, language);
        }
    }

    add(code: string, language: string) {
        let line = new Line(this.lines.length, code);
        let elem = new LineElem(line, language, this.lineClickListener, this.noteAddListener);
        this.lines.push(elem);
        elem.render();
        this.container.appendChild(elem.elem);
    }

    hasComment(lineNo: number) {
        this.lines[lineNo].hasComment();
    }

    noComment(lineNo: number) {
        this.lines[lineNo].noComment();
    }

    isCollapsedHeader(lineNo: number) {
        this.lines[lineNo].isCollapsedHeader()
    }

    noCollapsedHeader(lineNo: number) {
        this.lines[lineNo].noCollapsedHeader()
    }

    isCollapsed(lineNo: number) {
        this.lines[lineNo].isCollapsed()
    }

    noCollapsed(lineNo: number) {
        this.lines[lineNo].noCollapsed()
    }

    clear() {
        for(let i = 0; i < this.lines.length; ++i) {
            this.lines[i].clear();
        }
    }

    select(lineNo: number) {
        this.lines[lineNo].select();
    }

    unselect(lineNo: number) {
        this.lines[lineNo].unselect();
    }

    getY(lineNo: number) {
        return this.lines[lineNo].getY();
    }

    scroll(lineNo: number, offset: number) {
        let node = this.container;
        let containerOffset = 0;
        while(node != null) {
            containerOffset += node.offsetTop;
            node = node.parentElement;
        }
        window.scroll(0, this.lines[lineNo].getY() + containerOffset - Math.round(offset));
    }

    getCode(lineNo: number) {
        if(lineNo < 0 || lineNo >= this.lines.length) {
            return null;
        }

        return this.lines[lineNo].line.code;
    }
}

export {Lines};