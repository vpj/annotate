
class Note {
    path: string
    pre: string[]
    post: string[]
    code: string[]
    note: string
    collapsed: boolean
    codeCollapsed: boolean

    // constructor(
    //     pre: string[],
    //     post: string[],
    //     code: string[],
    //     note: string) {
    //         this.pre = pre
    //         this.post = post
    //         this.code = code
    //         this.note = note
    // }

    constructor(path, opt: { [key: string]: any }) {
        this.path = path
        this.pre = opt['pre']
        this.post = opt['post']
        this.code = opt['code']
        this.note = opt['note']
        this.collapsed = opt['collapsed'] || false
        this.codeCollapsed = opt['codeCollapsed'] || false
    }

    toJSON() {
        return {
            'pre': this.pre,
            'post': this.post,
            'code': this.code,
            'note': this.note,
            'collapsed': this.collapsed,
            'codeCollapsed': this.codeCollapsed
        }
    }

    static create(path: string,
        pre: string[],
        post: string[],
        code: string[],
        note: string,
        opt: {}) {
        let n = {
            'pre': pre,
            'post': post,
            'code': code,
            'note': note
        }
        for (let k in opt) {
            if (!(k in n)) {
                n[k] = opt[k]
            }
        }

        return new Note(path, n)
    }
}


export { Note }
