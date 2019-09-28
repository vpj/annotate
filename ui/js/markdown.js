define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MarkDown = window.markdownit();
    exports.MarkDown = MarkDown;
    MarkDown.use(window.markdownitMathjax({
        beforeMath: '<script type="math/tex; mode=display">',
        afterMath: '</script>',
        beforeInlineMath: '$',
        afterInlineMath: '$',
        beforeDisplayMath: '$$',
        afterDisplayMath: '$$'
    }));
    var MathJax = window.MathJax;
    exports.MathJax = MathJax;
});
