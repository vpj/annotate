// function getElementData(elem: HTMLElement) {
//     while(elem != null) {
//         if(elem.annotate != null) {
//             return elem.annotate;
//         }
//         elem = <HTMLElement>elem.parentNode;
//     }
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //     return null;
    // }
    function createIcon(name) {
        var icon = document.createElement('i');
        icon.classList.add('fas');
        icon.classList.add("fa-" + name);
        return icon;
    }
    exports.createIcon = createIcon;
    function getLanguage(path) {
        var parts = path.split('.');
        var extension = parts[parts.length - 1];
        switch (extension) {
            case 'py':
                return 'python';
            case 'php':
                return 'php';
            case 'js':
                return 'javascript';
            case 'ts':
                return 'typescript';
            case 'md':
                return 'markdown';
            default:
                return 'text';
        }
    }
    exports.getLanguage = getLanguage;
});
