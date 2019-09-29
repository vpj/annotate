define(["require", "exports", "./weya", "./project"], function (require, exports, weya_1, project_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LineElem = /** @class */ (function () {
        function LineElem(path, lineNo, code, highlighted, language, clickListener, addListener) {
            var _this = this;
            this.onSelectFile = function () {
                project_1.Project.instance().selectFile(_this.path);
            };
            this.onAddCommentClick = function () {
                _this.addListener(_this.path, _this.lineNo, _this.lineNo);
            };
            this.onLineClick = function () {
                console.log('click');
                _this.clickListener(_this.path, _this.lineNo);
            };
            this.path = path;
            this.lineNo = lineNo;
            this.code = code;
            this.highlighted = highlighted;
            this.language = language;
            this.comments = 0;
            this.collapsed = 0;
            this.collapsedHeader = 0;
            this.clickListener = clickListener;
            this.addListener = addListener;
            this.userSelected = false;
            this.elem = null;
            this.rank = 0;
            this.isShowBreakBefore = false;
            this.isShowPath = false;
            this.commentKeys = {};
        }
        LineElem.prototype.render = function (rank) {
            var _this = this;
            this.rank = rank;
            this.elem = weya_1.Weya('div.line', function ($) {
                if (_this.isShowPath) {
                    $('div.path', _this.path, { on: { 'click': _this.onSelectFile } });
                }
                if (_this.isShowBreakBefore) {
                    $('div', '...');
                }
                _this.isShowBreakBefore = false;
                _this.isShowPath = false;
                _this.addCommentIcon = $('i.fas.fa-plus.add_comment', { on: { 'click': _this.onAddCommentClick } });
                _this.hasComments = $('i.fas.fa-comment.has_comments');
                _this.hasCommentsMany = $('i.fas.fa-comments.has_comments_many');
                _this.lineNoElem = $('span.line_no', "" + (_this.lineNo + 1));
            });
            this.codeElem = document.createElement("span");
            if (this.code.trim() !== "") {
                // let h = highlight(this.language, this.code, true, null);
                this.codeElem.innerHTML = this.highlighted;
                this.elem.appendChild(this.codeElem);
            }
            this.codeElem.addEventListener('click', this.onLineClick);
            this.hasComments.addEventListener('click', this.onLineClick);
            this.hasCommentsMany.addEventListener('click', this.onLineClick);
            this.setCommentsCss();
            this.setCollapsedCss();
            this.setCollapsedHeaderCss();
        };
        LineElem.prototype.isRendered = function () {
            return this.elem !== null;
        };
        LineElem.prototype.remove = function () {
            this.elem.parentElement.removeChild(this.elem);
            this.elem = null;
        };
        LineElem.prototype.showPath = function () {
            this.isShowPath = true;
        };
        LineElem.prototype.showBreakBefore = function () {
            this.isShowBreakBefore = true;
        };
        LineElem.prototype.setCommentsCss = function () {
            if (this.comments == 0) {
                this.elem.classList.remove("commented");
                this.elem.classList.remove("commented_many");
            }
            else if (this.comments === 1) {
                this.elem.classList.add("commented");
                this.elem.classList.remove("commented_many");
            }
            else {
                this.elem.classList.add("commented_many");
            }
        };
        LineElem.prototype.addComment = function (key) {
            if (this.commentKeys[key] == null) {
                this.commentKeys[key] = true;
                this.comments++;
            }
            this.setCommentsCss();
        };
        LineElem.prototype.removeComment = function (key) {
            if (this.commentKeys[key] != null) {
                delete this.commentKeys[key];
                this.comments--;
            }
            this.setCommentsCss();
        };
        LineElem.prototype.getCommentKeys = function () {
            return this.commentKeys;
        };
        LineElem.prototype.setCollapsedHeaderCss = function () {
            if (this.collapsedHeader === 0)
                this.elem.classList.remove('collapsed_header');
            else
                this.elem.classList.add('collapsed_header');
        };
        LineElem.prototype.setCollapsedHeader = function (isHeader) {
            if (isHeader)
                this.collapsedHeader++;
            else
                this.collapsedHeader--;
            this.setCollapsedHeaderCss();
        };
        LineElem.prototype.setCollapsedCss = function () {
            if (this.collapsed === 0)
                this.elem.classList.remove('collapsed');
            else
                this.elem.classList.add('collapsed');
        };
        LineElem.prototype.setCollapsed = function (isCollapsed) {
            if (isCollapsed)
                this.collapsed++;
            else
                this.collapsed--;
            this.setCollapsedCss();
        };
        LineElem.prototype.clear = function () {
            this.elem.classList.remove("commented");
            this.elem.classList.remove("commented_many");
            this.comments = 0;
            this.elem.classList.remove("selected");
        };
        LineElem.prototype.setSelected = function (isSelected) {
            if (isSelected) {
                this.elem.classList.add("selected");
            }
            else {
                this.elem.classList.remove("selected");
            }
        };
        LineElem.prototype.getY = function () {
            return this.elem.offsetTop;
        };
        LineElem.prototype.userSelect = function (selected) {
            if (selected == this.userSelected)
                return;
            this.userSelected = selected;
            if (selected) {
                this.elem.classList.add('user_selected');
            }
            else {
                this.elem.classList.remove('user_selected');
            }
        };
        return LineElem;
    }());
    exports.LineElem = LineElem;
});
