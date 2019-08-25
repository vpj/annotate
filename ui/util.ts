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

export {createIcon};