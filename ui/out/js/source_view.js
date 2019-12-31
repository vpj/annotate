define(["require", "exports", "./line", "./util", "./hljs"], function (require, exports, line_1, util_1, hljs_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var SourceView = /** @class */ (function () {
        function SourceView(container, lineClickListener, noteAddListener) {
            this.allLines = {};
            this.renderedLines = [];
            this.container = container;
            this.lineClickListener = lineClickListener;
            this.noteAddListener = noteAddListener;
            this.setEvents();
        }
        SourceView.prototype.setEvents = function () {
            var _this = this;
            this.container.addEventListener('mousedown', function (ev) {
                // console.log('down', ev.pageX, ev.pageY, ev);
                _this.onUserSelect(ev.clientX, ev.clientY, 'start');
            });
            this.container.addEventListener('mousemove', function (ev) {
                // console.log('move', ev.pageX, ev.pageY, ev);
                _this.onUserSelect(ev.clientX, ev.clientY, 'move');
            });
            this.container.addEventListener('mouseup', function (ev) {
                // console.log('up', ev.pageX, ev.pageY, ev);
                _this.onUserSelect(ev.clientX, ev.clientY, 'end');
            });
            this.container.addEventListener('mouseleave', function (ev) {
                // console.log('leave', ev.pageX, ev.pageY, ev);
                _this.onUserSelect(ev.clientX, ev.clientY, 'leave');
            });
        };
        SourceView.prototype.removeAll = function () {
            for (var _i = 0, _a = this.renderedLines; _i < _a.length; _i++) {
                var line = _a[_i];
                line.remove();
            }
            this.renderedLines = [];
        };
        SourceView.prototype.search = function () {
            this.selectedFile = null;
            this.selectedLines = {};
            this.removeAll();
        };
        SourceView.prototype.selectLines = function (path, start, end) {
            var lines = this.allLines[path];
            start = Math.max(0, start);
            end = Math.min(lines.length - 1, end);
            if (this.selectedLines[path] == null) {
                this.selectedLines[path] = {};
            }
            for (var i = start; i < end; ++i) {
                this.selectedLines[path][i] = true;
            }
        };
        SourceView.prototype.renderSelectedLines = function () {
            for (var path in this.selectedLines) {
                var lineNos = [];
                for (var lineNo in this.selectedLines[path]) {
                    lineNos.push(parseInt(lineNo));
                }
                lineNos.sort(function (x, y) { return x - y; });
                var prev = null;
                for (var _i = 0, _a = lineNos.slice(1); _i < _a.length; _i++) {
                    var lineNo = _a[_i];
                    var line = this.allLines[path][lineNo];
                    if (prev == null) {
                        line.showPath();
                    }
                    else if (prev !== lineNo - 1) {
                        line.showBreakBefore();
                    }
                    prev = lineNo;
                    line.render(this.renderedLines.length);
                    this.renderedLines.push(line);
                    this.container.appendChild(line.elem);
                }
            }
        };
        SourceView.prototype.selectFile = function (path) {
            this.selectedFile = path;
            this.removeAll();
            var lines = this.allLines[path];
            for (var i = 0; i < lines.length; ++i) {
                var elem = lines[i];
                elem.render(i);
                this.renderedLines.push(elem);
                this.container.appendChild(elem.elem);
            }
        };
        SourceView.prototype.load = function (files) {
            for (var path in files) {
                var lines = files[path];
                this.allLines[path] = [];
                var language = util_1.getLanguage(path);
                var h = hljs_1.highlight(language, lines.join("\n"), true, null);
                var highlightedLines = h.value.split('\n');
                if (lines.length === 0) {
                    highlightedLines = [];
                }
                if (highlightedLines.length !== lines.length) {
                    throw Error("Highlighting Error");
                }
                var spans = [];
                for (var i = 0; i < lines.length; ++i) {
                    var h_1 = highlightedLines[i];
                    var hu = spans.join('') + h_1;
                    var ends = [];
                    for (var j = 0; j < spans.length; ++j) {
                        ends.push('</span>');
                    }
                    hu += ends.join('');
                    var elem = new line_1.LineElem(path, i, lines[i], hu, language, this.lineClickListener, this.noteAddListener);
                    var p = 0;
                    for (var j = 0; true; ++j) {
                        p = h_1.indexOf('<span', p);
                        if (p === -1) {
                            break;
                        }
                        var e = h_1.indexOf('>');
                        spans.push(h_1.slice(p, e + 1));
                        p++;
                    }
                    p = 0;
                    for (var j = 0; true; ++j) {
                        p = h_1.indexOf('</span', p);
                        if (p === -1) {
                            break;
                        }
                        spans.pop();
                        p++;
                    }
                    this.allLines[path].push(elem);
                }
            }
        };
        SourceView.prototype.getRenderedLineRank = function (path, lineNo) {
            return this.allLines[path][lineNo].rank;
        };
        SourceView.prototype.onUserSelect = function (x, y, event) {
            if (this.renderedLines.length == 0)
                return;
            x -= this.container.getBoundingClientRect().left;
            y -= this.container.getBoundingClientRect().top;
            var line = this.renderedLines[0];
            // console.log(x, y);
            var height = line.elem.getBoundingClientRect().height;
            var margin = line.codeElem.getBoundingClientRect().left -
                this.container.getBoundingClientRect().left;
            // console.log(height, margin);
            var lineNo = Math.floor(y / height);
            if (event == 'start') {
                if (x >= margin) {
                    this.clearUserSelection();
                    return;
                }
                this.userSelection = {
                    start: lineNo,
                    end: lineNo
                };
                this.markUserSelection();
            }
            else if (event == 'move') {
                if (this.userSelection == null)
                    return;
                this.userSelection.end = lineNo;
                this.markUserSelection();
            }
            else if (event == 'leave') {
                if (this.userSelection == null)
                    return;
                this.clearUserSelection();
            }
            else {
                if (this.userSelection == null)
                    return;
                var f = Math.min(this.userSelection.start, this.userSelection.end);
                var t = Math.max(this.userSelection.start, this.userSelection.end);
                if (f != t) {
                    this.noteAddListener(this.selectedFile, f, t);
                }
                this.clearUserSelection();
            }
        };
        SourceView.prototype.markUserSelection = function () {
            for (var _i = 0, _a = this.renderedLines; _i < _a.length; _i++) {
                var l = _a[_i];
                l.userSelect(false);
            }
            if (this.userSelection == null)
                return;
            var f = Math.min(this.userSelection.start, this.userSelection.end);
            var t = Math.max(this.userSelection.start, this.userSelection.end);
            for (var i = f; i <= t; ++i) {
                this.renderedLines[i].userSelect(true);
            }
        };
        SourceView.prototype.clearUserSelection = function () {
            this.userSelection = null;
            this.markUserSelection();
        };
        SourceView.prototype.addComment = function (path, lineNo, key) {
            this.allLines[path][lineNo].addComment(key);
        };
        SourceView.prototype.removeComment = function (path, lineNo, key) {
            this.allLines[path][lineNo].removeComment(key);
        };
        SourceView.prototype.getCommentKeys = function (path, lineNo) {
            return this.allLines[path][lineNo].getCommentKeys();
        };
        SourceView.prototype.setCollapsedHeader = function (path, lineNo, isHeader) {
            this.allLines[path][lineNo].setCollapsedHeader(isHeader);
        };
        SourceView.prototype.setCollapsed = function (path, lineNo, isCollapsed) {
            this.allLines[path][lineNo].setCollapsed(isCollapsed);
        };
        SourceView.prototype.setSelected = function (path, lineNo, isSelected) {
            this.allLines[path][lineNo].setSelected(isSelected);
        };
        SourceView.prototype.getY = function (path, lineNo) {
            return this.allLines[path][lineNo].getY();
        };
        SourceView.prototype.scroll = function (path, lineNo, offset) {
            var line = this.allLines[path][lineNo];
            if (!line.isRendered()) {
                return;
            }
            var node = this.container;
            var containerOffset = 0;
            while (node != null) {
                containerOffset += node.offsetTop;
                node = node.parentElement;
            }
            window.scroll(0, line.getY() + containerOffset - Math.round(offset));
        };
        SourceView.prototype.getCode = function (path, lineNo) {
            var lines = this.allLines[path];
            if (lineNo < 0 || lineNo >= lines.length) {
                return null;
            }
            return lines[lineNo];
        };
        return SourceView;
    }());
    exports.SourceView = SourceView;
});
