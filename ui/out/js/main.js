define(["require", "exports", "./project"], function (require, exports, project_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    if (document.readyState === "complete" || document.readyState === 'interactive') {
        project_1.Project.instance().load();
    }
    else {
        document.addEventListener('DOMContentLoaded', function () {
            project_1.Project.instance().load();
        });
    }
});
