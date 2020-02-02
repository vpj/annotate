import {Note} from "./note"

class NoteMatch {
    readonly start: number
    readonly end: number
    readonly score: number
    readonly codeScore: number

    constructor(start: number, end: number, codeScore: number, score: number) {
        this.start = start
        this.end = end
        this.score = score
        this.codeScore = codeScore
    }
}

class FileSourceCodeMatcher {
    lines: Array<string>
    lineNumbers: { [line: string]: number[] }
    actualLineNumbers: { [lineno: number]: number }

    private trim(line: string) {
        return line.replace(/\s/g, "")
    }

    constructor(lines: string[]) {
        this.load(lines)
    }

    private load(lines: string[]) {
        this.lines = lines
        this.lineNumbers = {}
        this.actualLineNumbers = {}

        let lineNo = 0
        for (let i = 0; i < lines.length; ++i) {
            let line = this.trim(lines[i])
            if (line === "")
                continue

            if (!(line in this.lineNumbers)) {
                this.lineNumbers[line] = []
            }
            this.lineNumbers[line].push(lineNo)
            this.actualLineNumbers[lineNo] = i
            lineNo++
        }
    }

    private getLineNumbers(line: string) {
        line = this.trim(line)

        if (line === "") {
            return null
        } else if (line in this.lineNumbers) {
            return this.lineNumbers[line]
        } else {
            return []
        }
    }

    private getBestMatch(matches: number[][], weights: number[]) {
        // TODO: Optimize, use a hash table with only the matching lines
        let reward: { [line: number]: number }[] = [{0: 0}]
        let parent: { [line: number]: number }[] = [{0: -1}]
        let isUsed: { [line: number]: boolean }[] = [{0: false}]

        for (let i = 0; i < matches.length; ++i) {
            reward.push({})
            parent.push({})
            isUsed.push({})

            for (let jj in reward[i]) {
                let j = parseInt(jj)
                reward[i + 1][j] = reward[i][j] - weights[i]
                parent[i + 1][j] = j
                isUsed[i + 1][j] = false
            }

            for (let m of matches[i]) {
                if (!(m + 1 in reward[i + 1])) {
                    reward[i + 1][m + 1] = -1e10
                    parent[i + 1][m + 1] = -1
                    isUsed[i + 1][m + 1] = false
                }

                for (let jj in reward[i]) {
                    let j = parseInt(jj)

                    if (j > m)
                        continue

                    if (j == 0) {
                        if (reward[i + 1][m + 1] < reward[i][j]) {
                            reward[i + 1][m + 1] = reward[i][j]
                            parent[i + 1][m + 1] = j
                            isUsed[i + 1][m + 1] = true
                        }
                    } else {
                        if (reward[i + 1][m + 1] < reward[i][j] - weights[i] * (m - j)) {
                            reward[i + 1][m + 1] = reward[i][j] - weights[i] * (m - j)
                            parent[i + 1][m + 1] = j
                            isUsed[i + 1][m + 1] = true
                        }
                    }
                }
            }
        }

        let maxRew = -1e10
        let maxRewLine = -1

        for (let jj in reward[matches.length]) {
            let j = parseInt(jj)

            if (reward[matches.length][j] > maxRew) {
                maxRew = reward[matches.length][j]
                maxRewLine = j
            }
        }

        let bestMatch = []
        for (let i = 0; i < matches.length; ++i) {
            bestMatch.push(-1)
        }

        for (let i = matches.length - 1; i >= 0; --i) {
            if (isUsed[i + 1][maxRewLine])
                bestMatch[i] = maxRewLine - 1
            else
                bestMatch[i] = -1

            maxRewLine = parent[i + 1][maxRewLine]
        }

        return bestMatch
    }

    match(note: Note): NoteMatch {
        let matches: number[][] = []
        let weights: number[] = []

        // TODO cleanup
        for (let l of note.pre) {
            let lineNos = this.getLineNumbers(l)
            if (lineNos !== null) {
                matches.push(lineNos)
                weights.push(0.8)
            }
        }
        for (let l of note.code) {
            let lineNos = this.getLineNumbers(l)
            if (lineNos !== null) {
                matches.push(lineNos)
                weights.push(1.0)
            }
        }
        for (let l of note.post) {
            let lineNos = this.getLineNumbers(l)
            if (lineNos !== null) {
                matches.push(lineNos)
                weights.push(0.8)
            }
        }

        let match = this.getBestMatch(matches, weights)
        let start = 1e10
        let end = -1
        let matchWeight = 0
        let totanWeight = 0
        let codeMatchWeight = 0
        let codeTotalWeight = 0

        for (let i = 0; i < matches.length; ++i) {
            if (match[i] !== -1) {
                matchWeight += weights[i]
                if (weights[i] >= 1) {
                    codeMatchWeight += 1
                }
            }
            if (weights[i] >= 1) {
                codeTotalWeight += 1
            }
            totanWeight += weights[i]

            if (weights[i] >= 1.0 && match[i] !== -1) {
                let line = this.actualLineNumbers[match[i]]
                start = Math.min(start, line)
                end = Math.max(end, line)
            }
        }

        return new NoteMatch(start, end, codeMatchWeight / codeTotalWeight, matchWeight / totanWeight)
    }
}

class SourceCodeMatcher {
    private readonly files: { [path: string]: FileSourceCodeMatcher }

    constructor() {
        this.files = {}
    }

    load(all_files: { [path: string]: string[] }) {
        for (let path in all_files) {
            this.files[path] = new FileSourceCodeMatcher(all_files[path])
        }
    }

    match(note: Note): NoteMatch {
        return this.files[note.path].match(note)
    }
}

export {NoteMatch, SourceCodeMatcher}