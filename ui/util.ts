// function getElementData(elem: HTMLElement) {
//     while(elem != null) {
//         if(elem.annotate != null) {
//             return elem.annotate;
//         }
//         elem = <HTMLElement>elem.parentNode;
//     }

//     return null;
// }

function createIcon(name: string): HTMLElement {
    let icon = document.createElement('i');
    icon.classList.add('fas');
    icon.classList.add(`fa-${name}`);

    return icon;
}

function getLanguage(path: string) {
    let parts = path.split('.');
    let extension = parts[parts.length - 1];

    switch(extension) {
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

export {createIcon, getLanguage};