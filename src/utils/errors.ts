/**
 * Classes d'erreur personnalisées
 */

export class TrelloError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'TrelloError';
  }
}

export class TaskNotFoundError extends TrelloError {
  constructor(taskName: string, boardName?: string) {
    super(
      `Tâche "${taskName}" introuvable${boardName ? ` sur le board "${boardName}"` : ''}`
    );
    this.name = 'TaskNotFoundError';
    this.statusCode = 404;
  }
}

export class MultipleTasksFoundError extends TrelloError {
  constructor(taskName: string, count: number) {
    super(
      `Plusieurs tâches trouvées avec le nom "${taskName}" (${count} résultats). Veuillez être plus spécifique.`
    );
    this.name = 'MultipleTasksFoundError';
    this.statusCode = 400;
  }
}

export class BoardNotFoundError extends TrelloError {
  constructor(boardName: string) {
    super(`Board "${boardName}" introuvable`);
    this.name = 'BoardNotFoundError';
    this.statusCode = 404;
  }
}

export class ListNotFoundError extends TrelloError {
  constructor(listName: string, boardName?: string) {
    super(
      `Liste "${listName}" introuvable${boardName ? ` sur le board "${boardName}"` : ''}`
    );
    this.name = 'ListNotFoundError';
    this.statusCode = 404;
  }
}

export class LabelNotFoundError extends TrelloError {
  constructor(labelName: string, boardName?: string) {
    super(
      `Label "${labelName}" introuvable${boardName ? ` sur le board "${boardName}"` : ''}`
    );
    this.name = 'LabelNotFoundError';
    this.statusCode = 404;
  }
}

