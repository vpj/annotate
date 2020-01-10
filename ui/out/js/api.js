define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
            xhttp.open('GET', 'source.json', true);
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
            xhttp.open('GET', 'notes.json', true);
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
            xhttp.open('POST', 'notes', true);
            xhttp.setRequestHeader("Content-type", "application/json");
            xhttp.send(notes);
        };
        return AjaxApi;
    }());
    exports.api = new AjaxApi();
});
