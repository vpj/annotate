import {highlight} from "./hljs"
import {createIcon} from "./util";

interface FileClickListener {
    (file: string): void
}


class FileElem {
    file: string
    elem: HTMLDivElement;
    clickListener: FileClickListener;

    constructor(file: string, clickListener: FileClickListener) {
        this.file = file;
        this.elem = document.createElement('div');
        this.elem.className = "file";
        this.clickListener = clickListener;
        this.elem.textContent = file;

        this.elem.addEventListener('click', this.onClick.bind(this));
    }

    private onClick() {
        if(this.clickListener != null) {
            this.clickListener(this.file);
        }
    }
}

class Files {
    files: FileElem[]
    container: HTMLElement;
    fileClickListener: FileClickListener;

    constructor(container: HTMLElement, fileClickListener: FileClickListener) {
        this.files = [];
        this.container = container;
        this.fileClickListener = fileClickListener;
    }

    load(files: string[]) {
        for(let f of files) {
            this.add(f);
        }
    }

    add(file: string) {
        let elem = new FileElem(file, this.fileClickListener)
        this.files.push(elem);
        this.container.appendChild(elem.elem);
    }
}

export {Files};