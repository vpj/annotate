define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NoteMatch = /** @class */ (function () {
        function NoteMatch(start, end) {
            this.start = start;
            this.end = end;
        }
        return NoteMatch;
    }());
    exports.NoteMatch = NoteMatch;
    var FileSourceCodeMatcher = /** @class */ (function () {
        function FileSourceCodeMatcher(lines) {
            this.load(lines);
        }
        FileSourceCodeMatcher.prototype.trim = function (line) {
            return line.replace(/\s/g, "");
        };
        FileSourceCodeMatcher.prototype.load = function (lines) {
            this.lines = lines;
            this.lineNumbers = {};
            this.actualLineNumbers = {};
            var lineNo = 0;
            for (var i = 0; i < lines.length; ++i) {
                var line = this.trim(lines[i]);
                if (line === "")
                    continue;
                if (!(line in this.lineNumbers)) {
                    this.lineNumbers[line] = [];
                }
                this.lineNumbers[line].push(lineNo);
                this.actualLineNumbers[lineNo] = i;
                lineNo++;
            }
        };
        FileSourceCodeMatcher.prototype.getLineNumbers = function (line) {
            line = this.trim(line);
            if (line === "") {
                return null;
            }
            else if (line in this.lineNumbers) {
                return this.lineNumbers[line];
            }
            else {
                return [];
            }
        };
        FileSourceCodeMatcher.prototype.getBestMatch = function (matches, weights) {
            // TODO: Optimize, use a hash table with only the matching lines
            var reward = [{ 0: 0 }];
            var parent = [{ 0: -1 }];
            var isUsed = [{ 0: false }];
            for (var i = 0; i < matches.length; ++i) {
                reward.push({});
                parent.push({});
                isUsed.push({});
                for (var jj in reward[i]) {
                    var j = parseInt(jj);
                    reward[i + 1][j] = reward[i][j] - weights[i];
                    parent[i + 1][j] = j;
                    isUsed[i + 1][j] = false;
                }
                for (var _i = 0, _a = matches[i]; _i < _a.length; _i++) {
                    var m = _a[_i];
                    if (!(m + 1 in reward[i + 1])) {
                        reward[i + 1][m + 1] = -1e10;
                        parent[i + 1][m + 1] = -1;
                        isUsed[i + 1][m + 1] = false;
                    }
                    for (var jj in reward[i]) {
                        var j = parseInt(jj);
                        if (j > m)
                            continue;
                        if (j == 0) {
                            if (reward[i + 1][m + 1] < reward[i][j]) {
                                reward[i + 1][m + 1] = reward[i][j];
                                parent[i + 1][m + 1] = j;
                                isUsed[i + 1][m + 1] = true;
                            }
                        }
                        else {
                            if (reward[i + 1][m + 1] < reward[i][j] - weights[i] * (m - j)) {
                                reward[i + 1][m + 1] = reward[i][j] - weights[i] * (m - j);
                                parent[i + 1][m + 1] = j;
                                isUsed[i + 1][m + 1] = true;
                            }
                        }
                    }
                }
            }
            var maxRew = -1e10;
            var maxRewLine = -1;
            for (var jj in reward[matches.length]) {
                var j = parseInt(jj);
                if (reward[matches.length][j] > maxRew) {
                    maxRew = reward[matches.length][j];
                    maxRewLine = j;
                }
            }
            var bestMatch = [];
            for (var i = 0; i < matches.length; ++i) {
                bestMatch.push(-1);
            }
            for (var i = matches.length - 1; i >= 0; --i) {
                if (isUsed[i + 1][maxRewLine])
                    bestMatch[i] = maxRewLine - 1;
                else
                    bestMatch[i] = -1;
                maxRewLine = parent[i + 1][maxRewLine];
            }
            return bestMatch;
        };
        FileSourceCodeMatcher.prototype.match = function (note) {
            var matches = [];
            var weights = [];
            // TODO cleanup
            for (var _i = 0, _a = note.pre; _i < _a.length; _i++) {
                var l = _a[_i];
                var lineNos = this.getLineNumbers(l);
                if (lineNos !== null) {
                    matches.push(lineNos);
                    weights.push(0.8);
                }
            }
            for (var _b = 0, _c = note.code; _b < _c.length; _b++) {
                var l = _c[_b];
                var lineNos = this.getLineNumbers(l);
                if (lineNos !== null) {
                    matches.push(lineNos);
                    weights.push(1.0);
                }
            }
            for (var _d = 0, _e = note.post; _d < _e.length; _d++) {
                var l = _e[_d];
                var lineNos = this.getLineNumbers(l);
                if (lineNos !== null) {
                    matches.push(lineNos);
                    weights.push(0.8);
                }
            }
            var match = this.getBestMatch(matches, weights);
            var start = 1e10;
            var end = -1;
            for (var i = 0; i < matches.length; ++i) {
                if (weights[i] >= 1.0 && match[i] != -1) {
                    var line = this.actualLineNumbers[match[i]];
                    start = Math.min(start, line);
                    end = Math.max(end, line);
                }
            }
            return new NoteMatch(start, end);
        };
        return FileSourceCodeMatcher;
    }());
    var SourceCodeMatcher = /** @class */ (function () {
        function SourceCodeMatcher() {
            this.files = {};
        }
        SourceCodeMatcher.prototype.load = function (all_files) {
            for (var path in all_files) {
                this.files[path] = new FileSourceCodeMatcher(all_files[path]);
            }
        };
        SourceCodeMatcher.prototype.match = function (note) {
            return this.files[note.path].match(note);
        };
        return SourceCodeMatcher;
    }());
    exports.SourceCodeMatcher = SourceCodeMatcher;
});
