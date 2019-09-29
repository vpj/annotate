define(["require", "exports", "./note", "./note_elem", "./project"], function (require, exports, note_1, note_elem_1, project_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PADDING = 5;
    var MARGIN_FIRST = 30;
    var MARGIN_OTHER = 5;
    var Notes = /** @class */ (function () {
        function Notes(container) {
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
                project_1.Project.instance().sourceView.search();
                for (var _i = 0, selected_1 = selected; _i < selected_1.length; _i++) {
                    var note = selected_1[_i];
                    project_1.Project.instance().sourceView.selectLines(note.note.path, note.match.start - 3, note.match.end + 3);
                }
                project_1.Project.instance().sourceView.renderSelectedLines();
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
                        project_1.Project.instance().sourceView.scroll(path, lineNo, y);
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
                project_1.Project.instance().updateNotes(note.note.path, _this.toJSON());
            };
            this.onCollapseCode = function (path, key) {
                var note = _this.notes[path][key];
                var match = note.match;
                if (note.note.codeCollapsed) {
                    project_1.Project.instance().sourceView.setCollapsedHeader(note.note.path, match.start, true);
                    for (var i = match.start + 1; i <= match.end; ++i) {
                        project_1.Project.instance().sourceView.setCollapsed(note.note.path, i, true);
                    }
                }
                else {
                    project_1.Project.instance().sourceView.setCollapsedHeader(note.note.path, match.start, false);
                    for (var i = match.start + 1; i <= match.end; ++i) {
                        project_1.Project.instance().sourceView.setCollapsed(note.note.path, i, false);
                    }
                }
                project_1.Project.instance().updateNotes(note.note.path, _this.toJSON());
            };
            this.notes = {};
            this.notesCount = 0;
            this.container = container;
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
            var rank = project_1.Project.instance().sourceView.getRenderedLineRank(path, match.start);
            for (var i = 0; i < this.renderedNotes.length; ++i) {
                var n = this.renderedNotes[i];
                var r = project_1.Project.instance().sourceView.getRenderedLineRank(n.note.path, n.match.start);
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
            if (match.start > match.end) {
                return;
            }
            for (var i = match.start; i <= match.start; ++i) {
                project_1.Project.instance().sourceView.addComment(path, i, note.key);
            }
            if (note.note.codeCollapsed) {
                project_1.Project.instance().sourceView.setCollapsedHeader(path, match.start, true);
                for (var i = match.start + 1; i <= match.end; ++i) {
                    project_1.Project.instance().sourceView.setCollapsed(path, i, true);
                }
            }
        };
        Notes.prototype.addNote = function (note) {
            var match = project_1.Project.instance().sourceMatcher.match(note);
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
                var line = project_1.Project.instance().sourceView.getCode(path, start + i);
                if (line != null) {
                    pre.push(line.code);
                }
            }
            for (var i = start; i <= end; ++i) {
                code.push(project_1.Project.instance().sourceView.getCode(path, i).code);
            }
            for (var i = 1; i <= PADDING; ++i) {
                var line = project_1.Project.instance().sourceView.getCode(path, end + i);
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
                project_1.Project.instance().sourceView.removeComment(path, i, note.key);
            }
            if (note.note.codeCollapsed) {
                project_1.Project.instance().sourceView.setCollapsedHeader(path, match.start, false);
                for (var i = match.start + 1; i <= match.end; ++i) {
                    project_1.Project.instance().sourceView.setCollapsed(path, i, false);
                }
            }
        };
        Notes.prototype.newNote = function (path, start, end) {
            var noteElem = this.create(path, '', start, end, {});
            this.select(path, noteElem.key);
            noteElem.edit();
        };
        Notes.prototype.moveToLine = function (path, lineNo) {
            for (var k in project_1.Project.instance().sourceView.getCommentKeys(path, lineNo)) {
                this.select(path, k);
                break;
            }
        };
        Notes.prototype.clearSelected = function () {
            if (this.selected) {
                var oldNote = this.notes[this.selected.note.path][this.selected.key];
                oldNote.unselect();
                for (var i = oldNote.match.start; i <= oldNote.match.end; ++i) {
                    project_1.Project.instance().sourceView.setSelected(this.selected.note.path, i, false);
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
                project_1.Project.instance().sourceView.setSelected(path, i, true);
            }
            this.selected = note;
            var start = note.match.start;
            var isFirst = this.renderedNotes[0] === note;
            if (note.match.start > note.match.end) {
                return null;
            }
            window.requestAnimationFrame(function () {
                var y = project_1.Project.instance().sourceView.getY(path, start);
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
