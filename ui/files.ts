import {highlight} from "./hljs"
import {createIcon} from "./util";

interface FileClickListener {
    (file: string): void
}


class FileFolderElem {
    parent?: FolderElem;
    file: string
    elem: HTMLDivElement;
    label: HTMLDivElement;
    icon: HTMLElement;
    name: string;
    clickListener: FileClickListener;

    constructor(parent: FolderElem, name: string, file: string, clickListener: FileClickListener) {
        this.parent = parent;
        this.file = file;
        this.elem = document.createElement('div');
        this.label = document.createElement('div');
        this.label.className = 'label';
        this.clickListener = clickListener;
        this.name = name;

        this.icon = document.createElement('i');
        this.label.appendChild(this.icon);

        let span = document.createElement('span');
        span.textContent = name;
        this.label.appendChild(span);

        if(this.file != '') {
            this.elem.appendChild(this.label);
        }

        this.label.addEventListener('click', this.onClick);
    }

    protected onClick = () => {

    }

    search(s: string): boolean {
        return false;
    }
}

class FileElem extends FileFolderElem {
    constructor(parent: FolderElem, name: string, file: string, clickListener: FileClickListener) {
        super(parent, name, file, clickListener);
        this.elem.className = "file";
        this.icon.className = 'far fa-file'
    }

    protected onClick() {
        if(this.clickListener != null) {
            this.clickListener(this.file);
        }
    }

    search(s: string): boolean {
        if(this.name.toLowerCase().indexOf(s) != -1) {
            this.elem.style.display = 'block';
            return true;
        } else {
            this.elem.style.display = 'none';
            return false;
        }
    }

    updateNotes(hasNotes: boolean) {
        if(hasNotes) {
            this.icon.className = 'fas fa-comments';
        } else {
            this.icon.className = 'far fa-file'
        }
    }
}

class FolderElem extends FileFolderElem {
    files: FileFolderElem[]
    content: HTMLDivElement;
    hidden: boolean;

    constructor(parent: FolderElem, name: string, file: string, clickListener: FileClickListener) {
        super(parent, name, file, clickListener);
        this.elem.className = "folder";
        this.content = document.createElement('div');
        this.content.className = 'content';
        this.elem.appendChild(this.content);
        this.files = [];
        this.hidden = false;
        this.icon.className = 'far fa-folder-open'
    }

    protected onClick() {
        this.hidden = !this.hidden;

        if(this.hidden) {
            this.icon.className = 'far fa-folder'
            this.content.style.display = 'none';
        } else {
            this.icon.className = 'far fa-folder-open'
            this.content.style.display = 'block';
        }
    }

    private addChild(file: string): FileElem {
        let prefix = this.file == '' ? '' : (this.file + '/');
        let suffix = file.substr(prefix.length);
        let parts = suffix.split('/');
        let elem = null;
        if(parts.length == 1) {
            elem = new FileElem(this, parts[0], prefix + parts[0], this.clickListener);
        } else {
            elem = new FolderElem(this, parts[0], prefix + parts[0], this.clickListener);
        }
        this.files.push(elem);
        this.content.appendChild(elem.elem);

        if(parts.length != 1) {
            return elem.add(file);
        } else {
            return elem;
        }
    }

    add(file: string): FileElem {
        if(this.files.length == 0) {
            return this.addChild(file);
        }

        let last = this.files[this.files.length - 1];
        if(!(last instanceof FolderElem)) {
            return this.addChild(file);
        }

        if(last.isChild(file)) {
            return last.add(file);
        } else {
            return this.addChild(file);
        }
    }

    isChild(file: string) {
        return file.substr(0, this.file.length) == this.file;
    }

    search(s: string): boolean {
        if(this.name.toLowerCase().indexOf(s) != -1) {
            this.elem.style.display = 'block';
            for(let f of this.files) {
                f.search('');
            }
            return true;
        } else {
            let found = false;
            for(let f of this.files) {
                if(f.search(s)) {
                    found = true;
                }
            }

            if(found) {
                this.elem.style.display = 'block';
                return true;    
            }
        }

        this.elem.style.display = 'none';
        return false;
    }
}

class Files {
    top: FolderElem
    container: HTMLElement;
    search: HTMLInputElement;
    files: {[path: string]: FileElem}

    constructor(container: HTMLElement, fileClickListener: FileClickListener) {
        this.container = container;
        this.files = {};

        this.search = document.createElement('input');
        this.container.appendChild(this.search);

        this.top = new FolderElem(null, '', '', fileClickListener);
        this.container.appendChild(this.top.elem);

        this.search.addEventListener('keyup', this.onChange);
        this.search.addEventListener('paste', this.onChange);
    }

    updateNotes(file: string, hasNotes: boolean) {
        this.files[file].updateNotes(hasNotes);    
    }

    onChange = () => {
        console.log(this.search.value);
        this.top.search(this.search.value.toLowerCase());
    }

    load(files: string[]) {
        this.files = {};
        files.sort();
        for(let f of files) {
            this.files[f] = this.top.add(f);
        }
    }
}

export {Files};