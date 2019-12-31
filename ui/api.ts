import {sampleCode} from "./sample_code";
import {sampleNotes} from "./sample_notes";
import { AjaxHttpPort } from "./io/ajax";

class FixedApi {
    getSourceLines() {
        return sampleCode.split("\n");
    }

    getNotes() {
        let notes = []
        for(let n of sampleNotes) {
            let note = {
                'pre': n['pre'], //.split("\n"),
                'code': n['code'], //.split("\n"),
                'post': n['post'], //.split("\n"),
                'note': n['note']
            }

            notes.push(note);
        }
        return notes;
    }
}

class AjaxApi {
    getSourceLines(callback: Function) {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if(this.status == 200) {
                    let data = JSON.parse(this.responseText);
                    callback(data);
                } else {
                    alert("Server Error");
                }
            }
        };
          
        xhttp.open('GET', 'source.json', true);
        xhttp.send();
    }

    getNotes(callback: Function) {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if(this.status == 200) {
                    let data = JSON.parse(this.responseText);
                    callback(data);
                } else {
                    alert("Server Error");
                }
            }
        };
          
        xhttp.open('GET', 'notes.json', true)
        xhttp.send();
    }

    setNotes(notes, callback: Function) {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if(this.status == 200) {
                    callback()
                } else {
                    alert("Unable to save");
                }
            }
        };
          
        xhttp.open('POST', 'notes', true)
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send(notes);
    }
}

export const api = new AjaxApi();
export const PORT = new AjaxHttpPort('http', 'localhost', 8088, '/api')