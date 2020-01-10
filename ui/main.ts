import { Project } from "./project"

if (document.readyState === "complete" || document.readyState === 'interactive') {
    Project.instance().load();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        Project.instance().load();
    })
}
