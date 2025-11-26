"use strict";
/**
 * Classes d'erreur personnalisées
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelNotFoundError = exports.ListNotFoundError = exports.BoardNotFoundError = exports.MultipleTasksFoundError = exports.TaskNotFoundError = exports.TrelloError = void 0;
class TrelloError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'TrelloError';
    }
}
exports.TrelloError = TrelloError;
class TaskNotFoundError extends TrelloError {
    constructor(taskName, boardName) {
        super(`Tâche "${taskName}" introuvable${boardName ? ` sur le board "${boardName}"` : ''}`);
        this.name = 'TaskNotFoundError';
        this.statusCode = 404;
    }
}
exports.TaskNotFoundError = TaskNotFoundError;
class MultipleTasksFoundError extends TrelloError {
    constructor(taskName, count) {
        super(`Plusieurs tâches trouvées avec le nom "${taskName}" (${count} résultats). Veuillez être plus spécifique.`);
        this.name = 'MultipleTasksFoundError';
        this.statusCode = 400;
    }
}
exports.MultipleTasksFoundError = MultipleTasksFoundError;
class BoardNotFoundError extends TrelloError {
    constructor(boardName) {
        super(`Board "${boardName}" introuvable`);
        this.name = 'BoardNotFoundError';
        this.statusCode = 404;
    }
}
exports.BoardNotFoundError = BoardNotFoundError;
class ListNotFoundError extends TrelloError {
    constructor(listName, boardName) {
        super(`Liste "${listName}" introuvable${boardName ? ` sur le board "${boardName}"` : ''}`);
        this.name = 'ListNotFoundError';
        this.statusCode = 404;
    }
}
exports.ListNotFoundError = ListNotFoundError;
class LabelNotFoundError extends TrelloError {
    constructor(labelName, boardName) {
        super(`Label "${labelName}" introuvable${boardName ? ` sur le board "${boardName}"` : ''}`);
        this.name = 'LabelNotFoundError';
        this.statusCode = 404;
    }
}
exports.LabelNotFoundError = LabelNotFoundError;
