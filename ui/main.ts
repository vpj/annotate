import {api} from "./api";
import {SourceCode} from "./source_code";
import {Notes} from "./notes"
import {Lines} from "./line"
import {Project} from "./project"

const project = new Project();
project.load();

// const openNotes = <HTMLInputElement>document.getElementById("notes_file");
// const saveNotes = <HTMLInputElement>document.getElementById("save_notes");
// saveNotes.addEventListener('click', project.saveNotes.bind(project));

// function onDownloadNotes() {
//     let file = new Blob([notes.toJSON()], {type: 'text/json'});

//     let a = document.createElement("a");
//     let url = URL.createObjectURL(file);

//     a.href = url;
//     a.download = "notes.json";
//     document.body.appendChild(a);

//     a.click();

//     setTimeout(() => {
//         document.body.removeChild(a);
//         window.URL.revokeObjectURL(url);
//     }, 0);
// }

// function onNotesFile(e: Event) {
//     var file = openNotes.files[0];
//     if(!file) {
//         return;
//     }

//     let reader = new FileReader();
//     reader.onload = function(e2: any) {
//         let contents = e2.target.result;
//         contents = JSON.parse(contents);
//         notes.load(contents);
//         console.log(contents);
//     }

//     reader.readAsText(file);
// }

// openNotes.addEventListener("change", onNotesFile);
