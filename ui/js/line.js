define(["require", "exports", "./hljs", "./util"], function (require, exports, hljs_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var LineElem = /** @class */ (function () {
        function LineElem(path, lineNo, code, language, clickListener, addListener) {
            var _this = this;
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
            this.language = language;
            this.comments = 0;
            this.collapsed = 0;
            this.collapsedHeader = 0;
            this.clickListener = clickListener;
            this.addListener = addListener;
            this.userSelected = false;
            this.elem = null;
            this.rank = 0;
        }
        LineElem.prototype.render = function (rank) {
            this.rank = rank;
            this.elem = document.createElement('div');
            this.elem.className = "line";
            this.addCommentIcon = util_1.createIcon('plus');
            this.addCommentIcon.classList.add('add_comment');
            this.elem.appendChild(this.addCommentIcon);
            this.addCommentIcon.addEventListener('click', this.onAddCommentClick);
            this.hasComments = util_1.createIcon('comment');
            this.hasComments.classList.add('has_comments');
            this.elem.appendChild(this.hasComments);
            this.hasCommentsMany = util_1.createIcon('comments');
            this.hasCommentsMany.classList.add('has_comments_many');
            this.elem.appendChild(this.hasCommentsMany);
            this.lineNoElem = document.createElement('span');
            this.codeElem = document.createElement("span");
            this.lineNoElem.className = "line_no";
            this.lineNoElem.textContent = "" + (this.lineNo + 1);
            this.elem.appendChild(this.lineNoElem);
            if (this.code.trim() !== "") {
                var h = hljs_1.highlight(this.language, this.code, true, null);
                this.codeElem.innerHTML = h.value;
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
        LineElem.prototype.addComment = function () {
            this.comments++;
            this.setCommentsCss();
        };
        LineElem.prototype.removeComment = function () {
            this.comments--;
            this.setCommentsCss();
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
