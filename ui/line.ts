import {highlight} from "./hljs"
import {createIcon} from "./util";

interface LineClickListener {
    (path: string, lineNo: number): void
}

interface NoteAddListener {
    (path: string, start: number, end: number): void
}


class LineElem {
    path: string;
    lineNo: number;
    code: string;
    language: string;

    elem?: HTMLDivElement;
    lineNoElem: HTMLSpanElement;
    codeElem: HTMLSpanElement;
    addCommentIcon: HTMLElement;
    hasComments: HTMLElement;
    hasCommentsMany: HTMLElement;
    clickListener: LineClickListener;
    addListener: NoteAddListener;

    comments: number;
    collapsedHeader: number;
    collapsed: number;

    userSelected: boolean;
    rank: number

    constructor(path: string, lineNo: number, code: string, language: string, clickListener: LineClickListener, addListener: NoteAddListener) {
        this.path = path;
        this.lineNo = lineNo;
        this.code = code;
        this.language = language;

        this.comments = 0;
        this.collapsed = 0;
        this.collapsedHeader = 0;
        
        this.clickListener = clickListener;
        this.addListener = addListener;

        this.userSelected = false;
        this.elem = null;
        this.rank = 0;
    }

    render(rank: number) {
        this.rank = rank;
        this.elem = document.createElement('div');
        this.elem.className = "line";

        this.addCommentIcon = createIcon('plus');
        this.addCommentIcon.classList.add('add_comment');
        this.elem.appendChild(this.addCommentIcon);
        this.addCommentIcon.addEventListener('click', this.onAddCommentClick.bind(this));

        this.hasComments = createIcon('comment');
        this.hasComments.classList.add('has_comments');
        this.elem.appendChild(this.hasComments);
        this.hasCommentsMany = createIcon('comments');
        this.hasCommentsMany.classList.add('has_comments_many');
        this.elem.appendChild(this.hasCommentsMany);

        this.lineNoElem = document.createElement('span');
        this.codeElem = document.createElement("span");
    
        this.lineNoElem.className = "line_no";
        this.lineNoElem.textContent = `${this.lineNo + 1}`;
        this.elem.appendChild(this.lineNoElem);
    
        if(this.code.trim() !== "") {
            let h = highlight(this.language, this.code, true, null);
            this.codeElem.innerHTML = h.value;
            this.elem.appendChild(this.codeElem);
        }

        this.codeElem.addEventListener('click', this.onLineClick.bind(this));
        this.hasComments.addEventListener('click', this.onLineClick.bind(this));
        this.hasCommentsMany.addEventListener('click', this.onLineClick.bind(this));

        this.setCommentsCss();
        this.setCollapsedCss();
        this.setCollapsedHeaderCss();
    }

    isRendered() {
        return this.elem !== null;
    }

    remove() {
        this.elem.parentElement.removeChild(this.elem);
        this.elem = null;
    }

    private onAddCommentClick() {
        this.addListener(this.path, this.lineNo, this.lineNo);
    }

    private onLineClick() {
        this.clickListener(this.path, this.lineNo);
    }

    private setCommentsCss() {
        if(this.comments == 0) {
            this.elem.classList.remove("commented");
            this.elem.classList.remove("commented_many");
        } else if(this.comments === 1) {
            this.elem.classList.add("commented");
            this.elem.classList.remove("commented_many");
        } else {
            this.elem.classList.add("commented_many");
        }
    }

    addComment() {
        this.comments++;
        this.setCommentsCss();
    }

    removeComment() {
        this.comments--;
        this.setCommentsCss();
    }

    private setCollapsedHeaderCss() {
        if(this.collapsedHeader === 0)
            this.elem.classList.remove('collapsed_header')
        else
            this.elem.classList.add('collapsed_header')
    }

    setCollapsedHeader(isHeader: boolean) {
        if(isHeader)
            this.collapsedHeader++;
        else 
            this.collapsedHeader--;

        this.setCollapsedHeaderCss()
    }

    private setCollapsedCss() {
        if(this.collapsed === 0)
            this.elem.classList.remove('collapsed')
        else
            this.elem.classList.add('collapsed')
    }

    setCollapsed(isCollapsed: boolean) {
        if(isCollapsed)
            this.collapsed++;
        else 
            this.collapsed--;

        this.setCollapsedCss();
    }

    clear() {
        this.elem.classList.remove("commented");
        this.elem.classList.remove("commented_many");
        this.comments = 0;
        this.elem.classList.remove("selected");
    }

    setSelected(isSelected: boolean) {
        if(isSelected) {
            this.elem.classList.add("selected");
        } else {
            this.elem.classList.remove("selected");
        }
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

export {LineElem, LineClickListener, NoteAddListener};