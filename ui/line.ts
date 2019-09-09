import {highlight} from "./hljs"
import {createIcon} from "./util";

interface LineClickListener {
    (lineNo: number): void
}

interface NoteAddListener {
    (start: number, end: number): void
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
    addListener: NoteAddListener;

    comments: number;
    collapsedHeader: number;
    collapsed: number;
    language: string;

    userSelected: boolean;

    constructor(line: Line, language: string, clickListener: LineClickListener, addListener: NoteAddListener) {
        this.comments = 0;
        this.collapsed = 0;
        this.collapsedHeader = 0;
        
        this.line = line;
        this.elem = document.createElement('div');
        this.elem.className = "line";
        this.clickListener = clickListener;
        this.addListener = addListener;
        this.language = language;

        this.userSelected = false;
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
            this.addListener(this.line.lineNo, this.line.lineNo);
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

    userSelect(selected: boolean) {
        if(selected == this.userSelected)
            return;

        this.userSelected = selected;
        if(selected) {
            this.elem.classList.add('user_selected');
        } else {
            this.elem.classList.remove('user_selected');
        }
    }
}

class Lines {
    lines: LineElem[]
    container: HTMLElement;
    lineClickListener: LineClickListener;
    noteAddListener: NoteAddListener;
    userSelection?: any

    constructor(container: HTMLElement, lineClickListener: LineClickListener,
        noteAddListener: NoteAddListener) {
        this.lines = [];
        this.container = container;
        this.lineClickListener = lineClickListener;
        this.noteAddListener = noteAddListener;
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

    onUserSelect(x: number, y: number, event: string) {
        if(this.lines.length == 0) 
            return;

        x -= this.container.getBoundingClientRect().left;
        y -= this.container.getBoundingClientRect().top;

        let line = this.lines[0];

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
                this.noteAddListener(f, t)
            }
            this.clearUserSelection();
        }
    }

    markUserSelection() {
        for(let l of this.lines) {
            l.userSelect(false);
        }

        if(this.userSelection == null)
            return;

        let f = Math.min(this.userSelection.start, this.userSelection.end);
        let t = Math.max(this.userSelection.start, this.userSelection.end);
        for(let i = f; i <= t; ++i) {
            this.lines[i].userSelect(true);
        }
    }

    clearUserSelection() {
        this.userSelection = null;
        this.markUserSelection();
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