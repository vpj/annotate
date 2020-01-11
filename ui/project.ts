import { api } from "./api"
import { PORT, ROUTER } from "./app"
import { SourceView } from "./source_view"
import { SourceCodeMatcher } from "./source_code"
import { Notes } from "./notes"
import { Files } from "./files"

class Project {
    sourceView: SourceView
    sourceMatcher: SourceCodeMatcher
    notes: Notes
    files: Files
    selected_file: string
    private static _instance: Project = null

    private constructor() {
        this.sourceMatcher = new SourceCodeMatcher()
        this.sourceView = new SourceView(document.getElementById('source_code'),
            this.onCodeClick,
            this.onNoteAdd)
        this.notes = new Notes(document.getElementById("notes"))
        this.files = new Files(document.getElementById("files"),
            this.onFileClick)
    }

    static instance() {
        if (Project._instance == null) {
            Project._instance = new Project()
        }

        return Project._instance
    }

    selectFile(path: string) {
        this.selected_file = path
        this.sourceView.selectFile(path)
        this.notes.selectFile(path)
    }

    load() {
        api.getSourceLines((files) => {
            let all_code = files
            api.getNotes((notes) => {
                let all_notes = notes
                let files_list = []
                for (let f in files) {
                    files_list.push(f)
                    if (!(f in all_notes)) {
                        all_notes[f] = []
                    }
                }
                this.files.load(files_list)
                this.sourceMatcher.load(all_code)
                this.sourceView.load(all_code)
                this.notes.load(all_notes)

                for (let f in files) {
                    this.files.updateNotes(f, all_notes[f].length != 0)
                }

                ROUTER.start(null, false)
            })
        })
    }

    getDefaultFile() {
        for (let f in this.files.files) {
            return f
        }
    }

    searchNotes(search: string) {
        ROUTER.navigate(`s/${encodeURIComponent(search)}`, {trigger: false})
        this.notes.search(search)
    }

    private onFileClick = (file: string) => {
        ROUTER.navigate(encodeURIComponent(file))
    }

    private onCodeClick = (path: string, lineNo: number) => {
        this.notes.moveToLine(path, lineNo)
    }

    private onNoteAdd = (path: string, start: number, end: number) => {
        if (!this.notes.setNoteLines(path, start, end)) {
            this.notes.newNote(path, start, end)
        }
    }

    updateNotes(file: string, notes: { [path: string]: { [key: string]: any }[] }) {
        this.files.updateNotes(file, notes[file].length != 0)
        PORT.send('saveNotes', notes, () => {
            window.status = "Saved"
        })
    }
}

ROUTER.route('s/:search', [(search: string) => {
    Project.instance().notes.search(search)
}])

ROUTER.route(':path', [(path: string) => {
    Project.instance().selectFile(decodeURIComponent(path))
}])

ROUTER.route('', [(path: string) => {
    ROUTER.navigate(encodeURIComponent(Project.instance().getDefaultFile()))
}])

export { Project }