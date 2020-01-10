let MarkDown = (<any>window).markdownit()
MarkDown.use((<any>window).markdownitMathjax({
    beforeMath: '<script type="math/tex; mode=display">',
    afterMath: '</script>',
    beforeInlineMath: '$',
    afterInlineMath: '$',
    beforeDisplayMath: '$$',
    afterDisplayMath: '$$'
}))


let MathJax = (<any>window).MathJax

export { MarkDown, MathJax }