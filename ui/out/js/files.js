var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FileFolderElem = /** @class */ (function () {
        function FileFolderElem(parent, name, file, clickListener) {
            var _this = this;
            this.parent = parent;
            this.file = file;
            this.elem = document.createElement('div');
            this.label = document.createElement('div');
            this.label.className = 'label';
            this.clickListener = clickListener;
            this.name = name;
            this.icon = document.createElement('i');
            this.label.appendChild(this.icon);
            var span = document.createElement('span');
            span.textContent = name;
            this.label.appendChild(span);
            if (this.file != '') {
                this.elem.appendChild(this.label);
            }
            this.label.addEventListener('click', function () { _this.onClick(); });
        }
        FileFolderElem.prototype.onClick = function () {
        };
        FileFolderElem.prototype.search = function (s) {
            return false;
        };
        return FileFolderElem;
    }());
    var FileElem = /** @class */ (function (_super) {
        __extends(FileElem, _super);
        function FileElem(parent, name, file, clickListener) {
            var _this = _super.call(this, parent, name, file, clickListener) || this;
            _this.elem.className = "file";
            _this.icon.className = 'far fa-file';
            return _this;
        }
        FileElem.prototype.onClick = function () {
            if (this.clickListener != null) {
                this.clickListener(this.file);
            }
        };
        FileElem.prototype.search = function (s) {
            if (this.name.toLowerCase().indexOf(s) != -1) {
                this.elem.style.display = 'block';
                return true;
            }
            else {
                this.elem.style.display = 'none';
                return false;
            }
        };
        FileElem.prototype.updateNotes = function (hasNotes) {
            if (hasNotes) {
                this.icon.className = 'fas fa-comments';
            }
            else {
                this.icon.className = 'far fa-file';
            }
        };
        return FileElem;
    }(FileFolderElem));
    var FolderElem = /** @class */ (function (_super) {
        __extends(FolderElem, _super);
        function FolderElem(parent, name, file, clickListener) {
            var _this = _super.call(this, parent, name, file, clickListener) || this;
            _this.elem.className = "folder";
            _this.content = document.createElement('div');
            _this.content.className = 'content';
            _this.elem.appendChild(_this.content);
            _this.files = [];
            _this.hidden = false;
            _this.icon.className = 'far fa-folder-open';
            return _this;
        }
        FolderElem.prototype.onClick = function () {
            this.hidden = !this.hidden;
            if (this.hidden) {
                this.icon.className = 'far fa-folder';
                this.content.style.display = 'none';
            }
            else {
                this.icon.className = 'far fa-folder-open';
                this.content.style.display = 'block';
            }
        };
        FolderElem.prototype.addChild = function (file) {
            var prefix = this.file == '' ? '' : (this.file + '/');
            var suffix = file.substr(prefix.length);
            var parts = suffix.split('/');
            var elem = null;
            if (parts.length == 1) {
                elem = new FileElem(this, parts[0], prefix + parts[0], this.clickListener);
            }
            else {
                elem = new FolderElem(this, parts[0], prefix + parts[0], this.clickListener);
            }
            this.files.push(elem);
            this.content.appendChild(elem.elem);
            if (parts.length != 1) {
                return elem.add(file);
            }
            else {
                return elem;
            }
        };
        FolderElem.prototype.add = function (file) {
            if (this.files.length == 0) {
                return this.addChild(file);
            }
            var last = this.files[this.files.length - 1];
            if (!(last instanceof FolderElem)) {
                return this.addChild(file);
            }
            if (last.isChild(file)) {
                return last.add(file);
            }
            else {
                return this.addChild(file);
            }
        };
        FolderElem.prototype.isChild = function (file) {
            return file.substr(0, this.file.length) == this.file;
        };
        FolderElem.prototype.search = function (s) {
            if (this.name.toLowerCase().indexOf(s) != -1) {
                this.elem.style.display = 'block';
                for (var _i = 0, _a = this.files; _i < _a.length; _i++) {
                    var f = _a[_i];
                    f.search('');
                }
                return true;
            }
            else {
                var found = false;
                for (var _b = 0, _c = this.files; _b < _c.length; _b++) {
                    var f = _c[_b];
                    if (f.search(s)) {
                        found = true;
                    }
                }
                if (found) {
                    this.elem.style.display = 'block';
                    return true;
                }
            }
            this.elem.style.display = 'none';
            return false;
        };
        return FolderElem;
    }(FileFolderElem));
    var Files = /** @class */ (function () {
        function Files(container, fileClickListener) {
            var _this = this;
            this.onChange = function () {
                console.log(_this.search.value);
                _this.top.search(_this.search.value.toLowerCase());
            };
            this.container = container;
            this.files = {};
            this.search = document.createElement('input');
            this.container.appendChild(this.search);
            this.top = new FolderElem(null, '', '', fileClickListener);
            this.container.appendChild(this.top.elem);
            this.search.addEventListener('keyup', this.onChange);
            this.search.addEventListener('paste', this.onChange);
        }
        Files.prototype.updateNotes = function (file, hasNotes) {
            this.files[file].updateNotes(hasNotes);
        };
        Files.prototype.load = function (files) {
            this.files = {};
            files.sort();
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var f = files_1[_i];
                this.files[f] = this.top.add(f);
            }
        };
        return Files;
    }());
    exports.Files = Files;
});
