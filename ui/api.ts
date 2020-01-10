class AjaxApi {
    getSourceLines(callback: Function) {
        let xhttp = new XMLHttpRequest()
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    let data = JSON.parse(this.responseText)
                    callback(data)
                } else {
                    alert("Server Error")
                }
            }
        }

        xhttp.open('GET', 'source.json', true)
        xhttp.send()
    }

    getNotes(callback: Function) {
        let xhttp = new XMLHttpRequest()
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    let data = JSON.parse(this.responseText)
                    callback(data)
                } else {
                    alert("Server Error")
                }
            }
        }

        xhttp.open('GET', 'notes.json', true)
        xhttp.send()
    }

    setNotes(notes, callback: Function) {
        let xhttp = new XMLHttpRequest()
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    callback()
                } else {
                    alert("Unable to save")
                }
            }
        }

        xhttp.open('POST', 'notes', true)
        xhttp.setRequestHeader("Content-type", "application/json")
        xhttp.send(notes)
    }
}

export const api = new AjaxApi()
