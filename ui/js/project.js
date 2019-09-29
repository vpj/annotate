define(["require", "exports", "./api", "./source_view", "./source_code", "./notes", "./files"], function (require, exports, api_1, source_view_1, source_code_1, notes_1, files_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Project = /** @class */ (function () {
        function Project() {
            var _this = this;
            this.onFileClick = function (file) {
                _this.selectFile(file);
            };
            this.onCodeClick = function (path, lineNo) {
                _this.notes.moveToLine(path, lineNo);
            };
            this.onNoteAdd = function (path, start, end) {
                _this.notes.newNote(path, start, end);
            };
            this.sourceMatcher = new source_code_1.SourceCodeMatcher();
            this.sourceView = new source_view_1.SourceView(document.getElementById('source_code'), this.onCodeClick, this.onNoteAdd);
            this.notes = new notes_1.Notes(document.getElementById("notes"));
            this.files = new files_1.Files(document.getElementById("files"), this.onFileClick);
        }
        Project.instance = function () {
            if (Project._instance == null) {
                Project._instance = new Project();
            }
            return Project._instance;
        };
        Project.prototype.selectFile = function (path) {
            this.selected_file = path;
            this.sourceView.selectFile(path);
            this.notes.selectFile(path);
        };
        Project.prototype.load = function () {
            var _this = this;
            api_1.api.getSourceLines(function (files) {
                var all_code = files;
                api_1.api.getNotes(function (notes) {
                    var all_notes = notes;
                    var files_list = [];
                    for (var f in files) {
                        files_list.push(f);
                        if (!(f in all_notes)) {
                            all_notes[f] = [];
                        }
                    }
                    _this.files.load(files_list);
                    _this.sourceMatcher.load(all_code);
                    _this.sourceView.load(all_code);
                    _this.notes.load(all_notes);
                    for (var f in files) {
                        _this.selectFile(f);
                        break;
                    }
                    for (var f in files) {
                        if (all_notes[f].length > 0) {
                            console.log(f);
                        }
                        _this.files.updateNotes(f, all_notes[f].length != 0);
                    }
                });
            });
        };
        Project.prototype.updateNotes = function (file, notes) {
            this.files.updateNotes(file, notes[file].length != 0);
            api_1.api.setNotes(JSON.stringify(notes), function () {
                window.status = "Saved";
            });
        };
        Project._instance = null;
        return Project;
    }());
    exports.Project = Project;
});
