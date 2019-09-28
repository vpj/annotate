define(["require", "exports", "./note", "./note_elem"], function (require, exports, note_1, note_elem_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PADDING = 5;
    var MARGIN_FIRST = 30;
    var MARGIN_OTHER = 5;
    var Notes = /** @class */ (function () {
        function Notes(container, project) {
            var _this = this;
            this.onSearch = function () {
                var search = _this.notesSearch.value;
                if (search === _this.searchTerm) {
                    return;
                }
                _this.searchTerm = search;
                _this.selectedFile = null;
                var selected = [];
                for (var path in _this.notes) {
                    var notes = _this.notes[path];
                    for (var key in notes) {
                        var note = notes[key];
                        if (note.note.note.toLowerCase().indexOf(search) !== -1) {
                            selected.push(note);
                        }
                    }
                }
                _this.project.sourceView.search();
                for (var _i = 0, selected_1 = selected; _i < selected_1.length; _i++) {
                    var note = selected_1[_i];
                    _this.project.sourceView.selectLines(note.note.path, note.match.start - 10, note.match.end + 10);
                }
                _this.project.sourceView.renderSelectedLines();
                _this.removeAll();
                for (var _a = 0, selected_2 = selected; _a < selected_2.length; _a++) {
                    var note = selected_2[_a];
                    _this.renderNote(note);
                }
            };
            this.onNoteClick = function (path, key) {
                var note = _this.notes[path][key];
                if (_this.selected === note) {
                    _this.clearSelected();
                }
                else {
                    var y = note.elem.getBoundingClientRect().top;
                    var lineNo = _this.select(path, key);
                    if (lineNo != null) {
                        _this.project.sourceView.scroll(path, lineNo, y);
                    }
                }
            };
            this.onUpdate = function (note, isSaveOnly, start, end, content) {
                if (!isSaveOnly) {
                    if (_this.selected === note) {
                        _this.clearSelected();
                    }
                    _this.remove(note);
                    if (content != null && content.trim() != '') {
                        var newNote = _this.create(note.note.path, content, start, end, note.note.toJSON());
                        _this.select(newNote.note.path, newNote.key);
                    }
                }
                _this.project.updateNotes(note.note.path, _this.toJSON());
            };
            this.onCollapseCode = function (path, key) {
                var note = _this.notes[path][key];
                var match = note.match;
                if (note.note.codeCollapsed) {
                    _this.project.sourceView.setCollapsedHeader(note.note.path, match.start, true);
                    for (var i = match.start + 1; i <= match.end; ++i) {
                        _this.project.sourceView.setCollapsed(note.note.path, i, true);
                    }
                }
                else {
                    _this.project.sourceView.setCollapsedHeader(note.note.path, match.start, false);
                    for (var i = match.start + 1; i <= match.end; ++i) {
                        _this.project.sourceView.setCollapsed(note.note.path, i, false);
                    }
                }
                _this.project.updateNotes(note.note.path, _this.toJSON());
            };
            this.notes = {};
            this.notesCount = 0;
            this.container = container;
            this.project = project;
            this.lineToNote = {};
            this.selected = null;
            this.selectedFile = null;
            this.renderedNotes = [];
            this.notesSearch = document.getElementById('notes_search');
            this.notesSearch.addEventListener('keyup', this.onSearch);
            this.notesSearch.addEventListener('change', this.onSearch);
            this.notesSearch.addEventListener('paste', this.onSearch);
        }
        Notes.prototype.renderNote = function (note) {
            note.render();
            var nextNoteIdx = null;
            var match = note.match;
            var path = note.note.path;
            var rank = this.project.sourceView.getRenderedLineRank(path, match.start);
            for (var i = 0; i < this.renderedNotes.length; ++i) {
                var n = this.renderedNotes[i];
                var r = this.project.sourceView.getRenderedLineRank(n.note.path, n.match.start);
                if (r > rank) {
                    nextNoteIdx = i;
                    break;
                }
            }
            note.update();
            if (nextNoteIdx == null) {
                this.container.appendChild(note.elem);
                this.renderedNotes.push(note);
            }
            else {
                this.container.insertBefore(note.elem, this.renderedNotes[nextNoteIdx].elem);
                this.renderedNotes.splice(nextNoteIdx, 0, note);
            }
            if (!(path in this.lineToNote)) {
                this.lineToNote[path] = {};
            }
            if (match.start > match.end) {
                return;
            }
            for (var i = match.start; i <= match.start; ++i) {
                if (!(i in this.lineToNote)) {
                    this.lineToNote[path][i] = {};
                }
                this.lineToNote[path][i][note.key] = true;
                this.project.sourceView.addComment(path, i);
            }
            if (note.note.codeCollapsed) {
                this.project.sourceView.setCollapsedHeader(path, match.start, true);
                for (var i = match.start + 1; i <= match.end; ++i) {
                    this.project.sourceView.setCollapsed(path, i, true);
                }
            }
        };
        Notes.prototype.addNote = function (note) {
            var match = this.project.sourceMatcher.match(note);
            var key = "" + this.notesCount;
            var elem = new note_elem_1.NoteElem(key, note, match, this.onNoteClick, this.onUpdate, this.onCollapseCode);
            this.notesCount++;
            if (!(note.path in this.notes)) {
                this.notes[note.path] = {};
            }
            this.notes[note.path][key] = elem;
            return elem;
        };
        Notes.prototype.load = function (notes) {
            this.notes = {};
            this.notesCount = 0;
            this.lineToNote = {};
            this.selected = null;
            this.container.innerHTML = '';
            for (var path in notes) {
                for (var _i = 0, _a = notes[path]; _i < _a.length; _i++) {
                    var n = _a[_i];
                    var note = new note_1.Note(path, n);
                    this.addNote(note);
                }
            }
        };
        Notes.prototype.removeAll = function () {
            for (var _i = 0, _a = this.renderedNotes; _i < _a.length; _i++) {
                var n = _a[_i];
                n.remove();
            }
            this.renderedNotes = [];
            this.selected = null;
        };
        Notes.prototype.selectFile = function (path) {
            this.selectedFile = path;
            this.searchTerm = null;
            this.removeAll();
            var notes = this.notes[path];
            for (var k in notes) {
                this.renderNote(notes[k]);
            }
        };
        Notes.prototype.create = function (path, text, start, end, opt) {
            var pre = [];
            var code = [];
            var post = [];
            for (var i = -PADDING; i < 0; ++i) {
                var line = this.project.sourceView.getCode(path, start + i);
                if (line != null) {
                    pre.push(line.code);
                }
            }
            for (var i = start; i <= end; ++i) {
                code.push(this.project.sourceView.getCode(path, i).code);
            }
            for (var i = 1; i <= PADDING; ++i) {
                var line = this.project.sourceView.getCode(path, end + i);
                if (line != null) {
                    post.push(line.code);
                }
            }
            var note = note_1.Note.create(path, pre, post, code, text, opt);
            var noteElem = this.addNote(note);
            this.renderNote(noteElem);
            return noteElem;
        };
        Notes.prototype.remove = function (note) {
            if (!note.isRendered()) {
                return;
            }
            var path = note.note.path;
            delete this.notes[path][note.key];
            note.remove();
            for (var i = 0; i < this.renderedNotes.length; ++i) {
                if (this.renderedNotes[i] === note) {
                    this.renderedNotes.splice(i, 1);
                    break;
                }
            }
            var match = note.match;
            if (match.start > match.end) {
                return;
            }
            for (var i = match.start; i <= match.start; ++i) {
                delete this.lineToNote[path][i][note.key];
                this.project.sourceView.removeComment(path, i);
            }
            if (note.note.codeCollapsed) {
                this.project.sourceView.setCollapsedHeader(path, match.start, false);
                for (var i = match.start + 1; i <= match.end; ++i) {
                    this.project.sourceView.setCollapsed(path, i, false);
                }
            }
        };
        Notes.prototype.newNote = function (path, start, end) {
            var noteElem = this.create(path, '', start, end, {});
            this.select(path, noteElem.key);
            noteElem.edit();
        };
        Notes.prototype.moveToLine = function (path, lineNo) {
            for (var k in this.lineToNote[path][lineNo]) {
                this.select(path, k);
                break;
            }
        };
        Notes.prototype.clearSelected = function () {
            if (this.selected) {
                var oldNote = this.notes[this.selected.note.path][this.selected.key];
                oldNote.unselect();
                for (var i = oldNote.match.start; i <= oldNote.match.end; ++i) {
                    this.project.sourceView.setSelected(this.selected.note.path, i, false);
                }
                this.selected = null;
                if (oldNote.note.note.trim() == '') {
                    this.remove(oldNote);
                }
            }
        };
        Notes.prototype.select = function (path, key) {
            var _this = this;
            this.clearSelected();
            var note = this.notes[path][key];
            note.select();
            for (var i = note.match.start; i <= note.match.end; ++i) {
                this.project.sourceView.setSelected(path, i, true);
            }
            this.selected = note;
            var start = note.match.start;
            var isFirst = this.renderedNotes[0] === note;
            if (note.match.start > note.match.end) {
                return null;
            }
            window.requestAnimationFrame(function () {
                var y = _this.project.sourceView.getY(path, start);
                var yn = note.getY();
                var transform = y - yn;
                if (isFirst)
                    transform -= MARGIN_FIRST;
                else
                    transform -= MARGIN_OTHER;
                _this.container.style.transform = "translateY(" + transform + "px)";
            });
            return start;
        };
        Notes.prototype.toJSON = function () {
            var allNotes = {};
            for (var path in this.notes) {
                var json = [];
                for (var k in this.notes[path]) {
                    var n = this.notes[path][k];
                    json.push(n.note.toJSON());
                }
                allNotes[path] = json;
            }
            return allNotes;
        };
        return Notes;
    }());
    exports.Notes = Notes;
});
