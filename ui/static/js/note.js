define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Note = /** @class */ (function () {
        // constructor(
        //     pre: string[],
        //     post: string[],
        //     code: string[],
        //     note: string) {
        //         this.pre = pre;
        //         this.post = post;
        //         this.code = code;
        //         this.note = note;
        // }
        function Note(path, opt) {
            this.path = path;
            this.pre = opt['pre'];
            this.post = opt['post'];
            this.code = opt['code'];
            this.note = opt['note'];
            this.collapsed = opt['collapsed'] || false;
            this.codeCollapsed = opt['codeCollapsed'] || false;
        }
        Note.prototype.toJSON = function () {
            return {
                'pre': this.pre,
                'post': this.post,
                'code': this.code,
                'note': this.note,
                'collapsed': this.collapsed,
                'codeCollapsed': this.codeCollapsed
            };
        };
        Note.create = function (path, pre, post, code, note, opt) {
            var n = {
                'pre': pre,
                'post': post,
                'code': code,
                'note': note
            };
            for (var k in opt) {
                if (!(k in n)) {
                    n[k] = opt[k];
                }
            }
            return new Note(path, n);
        };
        return Note;
    }());
    exports.Note = Note;
});
