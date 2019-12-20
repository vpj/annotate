define(["require", "exports", "./sample_code", "./sample_notes"], function (require, exports, sample_code_1, sample_notes_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FixedApi = /** @class */ (function () {
        function FixedApi() {
        }
        FixedApi.prototype.getSourceLines = function () {
            return sample_code_1.sampleCode.split("\n");
        };
        FixedApi.prototype.getNotes = function () {
            var notes = [];
            for (var _i = 0, sampleNotes_1 = sample_notes_1.sampleNotes; _i < sampleNotes_1.length; _i++) {
                var n = sampleNotes_1[_i];
                var note = {
                    'pre': n['pre'],
                    'code': n['code'],
                    'post': n['post'],
                    'note': n['note']
                };
                notes.push(note);
            }
            return notes;
        };
        return FixedApi;
    }());
    var AjaxApi = /** @class */ (function () {
        function AjaxApi() {
        }
        AjaxApi.prototype.getSourceLines = function (callback) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        var data = JSON.parse(this.responseText);
                        callback(data);
                    }
                    else {
                        alert("Server Error");
                    }
                }
            };
            xhttp.open('GET', '/source.json', true);
            xhttp.send();
        };
        AjaxApi.prototype.getNotes = function (callback) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        var data = JSON.parse(this.responseText);
                        callback(data);
                    }
                    else {
                        alert("Server Error");
                    }
                }
            };
            xhttp.open('GET', '/notes.json', true);
            xhttp.send();
        };
        AjaxApi.prototype.setNotes = function (notes, callback) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        callback();
                    }
                    else {
                        alert("Unable to save");
                    }
                }
            };
            xhttp.open('POST', '/notes', true);
            xhttp.setRequestHeader("Content-type", "application/json");
            xhttp.send(notes);
        };
        return AjaxApi;
    }());
    exports.api = new AjaxApi();
});
