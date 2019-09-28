define(["require", "exports", "./markdown", "./util"], function (require, exports, markdown_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NoteEditElem = /** @class */ (function () {
        function NoteEditElem(saveListener) {
            this.elem = document.createElement('div');
            this.elem.className = 'edit';
            this.start = document.createElement('input');
            this.start.setAttribute('type', 'number');
            this.elem.appendChild(this.start);
            this.end = document.createElement('input');
            this.end.setAttribute('type', 'number');
            this.elem.appendChild(this.end);
            this.textArea = document.createElement('textarea');
            this.elem.appendChild(this.textArea);
            this.button = document.createElement('button');
            this.button.textContent = 'Save';
            this.elem.appendChild(this.button);
            this.button.addEventListener('click', saveListener);
        }
        NoteEditElem.prototype.focusEdit = function () {
            this.textArea.focus();
        };
        NoteEditElem.prototype.setContent = function (text, match) {
            this.textArea.value = text;
            this.start.value = "" + (match.start + 1);
            this.end.value = "" + (match.end + 1);
        };
        NoteEditElem.prototype.getContent = function () {
            return this.textArea.value;
        };
        NoteEditElem.prototype.getStart = function () {
            return parseInt(this.start.value) - 1;
        };
        NoteEditElem.prototype.getEnd = function () {
            return parseInt(this.end.value) - 1;
        };
        return NoteEditElem;
    }());
    var NoteViewControls = /** @class */ (function () {
        function NoteViewControls(editListener, removeListener, collapseListener, codeCollapseListener) {
            this.elem = document.createElement('div');
            this.elem.className = 'view_controls';
            this.collapse = util_1.createIcon('compress-arrows-alt');
            this.collapse.classList.add('collapse_note');
            this.elem.appendChild(this.collapse);
            this.collapse.addEventListener('click', collapseListener);
            this.codeCollapse = util_1.createIcon('minus-square');
            this.codeCollapse.classList.add('collapse_code');
            this.elem.appendChild(this.codeCollapse);
            this.codeCollapse.addEventListener('click', codeCollapseListener);
            this.edit = util_1.createIcon('edit');
            this.edit.classList.add('edit_button');
            this.elem.appendChild(this.edit);
            this.edit.addEventListener('click', editListener);
            this.remove = util_1.createIcon('trash');
            this.remove.classList.add('remove_button');
            this.elem.appendChild(this.remove);
            this.remove.addEventListener('click', removeListener);
        }
        return NoteViewControls;
    }());
    var NoteElem = /** @class */ (function () {
        function NoteElem(key, note, match, clickListener, updateListener, collapseListener) {
            var _this = this;
            this.onCodeCollapse = function () {
                _this.note.codeCollapsed = !_this.note.codeCollapsed;
                _this.collapseListener(_this.note.path, _this.key);
            };
            this.onCollapse = function () {
                _this.note.collapsed = !_this.note.collapsed;
                _this.setCollapseCss();
                _this.updateListener(_this, true, null, null, null);
            };
            this.onEdit = function () {
                _this.edit();
            };
            this.onRemove = function () {
                _this.updateListener(_this, false, null, null, null);
            };
            this.onSave = function () {
                var start = _this.editElem.getStart();
                var end = _this.editElem.getEnd();
                var content = _this.editElem.getContent();
                _this.updateListener(_this, false, start, end, content);
            };
            this.onClick = function () {
                _this.clickListener(_this.note.path, _this.key);
            };
            this.key = key;
            this.note = note;
            this.match = match;
            this.clickListener = clickListener;
            this.updateListener = updateListener;
            this.collapseListener = collapseListener;
            this.elem = null;
        }
        NoteElem.prototype.render = function () {
            this.elem = document.createElement('div');
            this.elem.classList.add("note");
            this.view = document.createElement('div');
            this.viewControls = new NoteViewControls(this.onEdit, this.onRemove, this.onCollapse, this.onCodeCollapse);
            this.elem.appendChild(this.view);
            this.elem.appendChild(this.viewControls.elem);
            this.view.className = 'view';
            this.editElem = new NoteEditElem(this.onSave);
            this.elem.appendChild(this.editElem.elem);
            this.view.addEventListener('click', this.onClick);
            this.setCollapseCss();
        };
        NoteElem.prototype.isRendered = function () {
            return this.elem !== null;
        };
        NoteElem.prototype.setCollapseCss = function () {
            if (this.note.collapsed) {
                this.elem.classList.add('collapsed');
            }
            else {
                this.elem.classList.remove('collapsed');
            }
        };
        NoteElem.prototype.edit = function () {
            this.elem.classList.add('editing');
            this.editElem.setContent(this.note.note, this.match);
            this.editElem.focusEdit();
        };
        NoteElem.prototype.update = function () {
            var _this = this;
            var html = markdown_1.MarkDown.render(this.note.note);
            this.view.innerHTML = html;
            var scripts = this.view.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; ++i) {
                var s = scripts[i];
                s.innerText = s.innerHTML.replace(/&amp;/g, '&');
            }
            window.requestAnimationFrame(function () {
                return markdown_1.MathJax.Hub.Queue(['Typeset', markdown_1.MathJax.Hub, _this.view]);
            });
        };
        NoteElem.prototype.remove = function () {
            this.elem.parentElement.removeChild(this.elem);
            this.elem = null;
        };
        NoteElem.prototype.getY = function () {
            return this.elem.offsetTop;
        };
        NoteElem.prototype.select = function () {
            this.elem.classList.add("selected");
        };
        NoteElem.prototype.unselect = function () {
            this.elem.classList.remove('editing');
            this.elem.classList.remove("selected");
        };
        return NoteElem;
    }());
    exports.NoteElem = NoteElem;
});
