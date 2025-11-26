"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trelloToolHandlers = void 0;
exports.createTrelloTask = createTrelloTask;
exports.completeTrelloTask = completeTrelloTask;
exports.updateTrelloDueDate = updateTrelloDueDate;
exports.archiveTrelloTask = archiveTrelloTask;
exports.moveTrelloTask = moveTrelloTask;
exports.getBoardActions = getBoardActions;
exports.getCardActions = getCardActions;
exports.improveCardDescription = improveCardDescription;
exports.updateCardField = updateCardField;
exports.moveCardToList = moveCardToList;
exports.deleteCard = deleteCard;
exports.archiveCard = archiveCard;
exports.createChecklist = createChecklist;
exports.addChecklistItem = addChecklistItem;
exports.checkChecklistItem = checkChecklistItem;
exports.addLabel = addLabel;
exports.shiftDueDates = shiftDueDates;
exports.listBoardLabels = listBoardLabels;
exports.listOverdueTasks = listOverdueTasks;
exports.sortListByDueDate = sortListByDueDate;
exports.prioritizeList = prioritizeList;
exports.groupCards = groupCards;
exports.getBoardSnapshot = getBoardSnapshot;
exports.analyzeBoardHealth = analyzeBoardHealth;
exports.auditList = auditList;
exports.auditHistory = auditHistory;
exports.generateBoardSummary = generateBoardSummary;
exports.suggestBoardCleanup = suggestBoardCleanup;
const trello_service_1 = require("./trello.service");
let trelloServiceInstance = null;
function getTrelloServiceInstance() {
    if (!trelloServiceInstance) {
        trelloServiceInstance = new trello_service_1.TrelloService();
    }
    return trelloServiceInstance;
}
function pickFirstString(...candidates) {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return undefined;
}
function parseFilters(value) {
    if (Array.isArray(value)) {
        const normalized = value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry) => entry.length > 0);
        return normalized.length > 0 ? normalized : undefined;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const normalized = value
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
        return normalized.length > 0 ? normalized : undefined;
    }
    return undefined;
}
function parseLimit(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
            throw new Error('Le paramètre "limit" doit être numérique.');
        }
        return parsed;
    }
    return undefined;
}
function ensureString(value, field) {
    if (!value) {
        throw new Error(`Le paramètre "${field}" est requis.`);
    }
    return value;
}
function ensureAllowedCriteria(criteria) {
    const allowed = ['label', 'member', 'due'];
    if (typeof criteria !== 'string' || !allowed.includes(criteria)) {
        throw new Error('Le paramètre "criteria" doit être "label", "member" ou "due"');
    }
    return criteria;
}
function parseItems(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);
}
function parseDays(value) {
    const numeric = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim().length > 0
            ? Number(value)
            : NaN;
    if (Number.isNaN(numeric)) {
        throw new Error('Le paramètre "days" doit être un nombre pour shiftDueDates');
    }
    return numeric;
}
async function createTrelloTask(params) {
    const trelloService = getTrelloServiceInstance();
    const board = pickFirstString(params.board, params.board_name, params.boardName);
    const list = pickFirstString(params.list, params.list_name, params.listName);
    const title = pickFirstString(params.title, params.card_name, params.cardName);
    const dueDate = pickFirstString(params.due_date, params.dueDate);
    if (!title) {
        throw new Error('Le paramètre "card_name" (ou "title") est requis pour createTrelloTask');
    }
    const card = await trelloService.createTask({
        board,
        list,
        title,
        due_date: dueDate,
    });
    return {
        message: `Tâche "${card.name}" créée avec succès`,
        data: card,
    };
}
async function completeTrelloTask(params) {
    const trelloService = getTrelloServiceInstance();
    const board = pickFirstString(params.board, params.board_name, params.boardName);
    const taskName = pickFirstString(params.task_name, params.card_name, params.taskName, params.cardName);
    if (!taskName) {
        throw new Error('Le paramètre "task_name" (ou "card_name") est requis pour completeTrelloTask');
    }
    const card = await trelloService.completeTask({
        board,
        task_name: taskName,
    });
    return {
        message: `Tâche "${card.name}" marquée comme terminée`,
        data: card,
    };
}
async function updateTrelloDueDate(params) {
    const trelloService = getTrelloServiceInstance();
    const board = pickFirstString(params.board, params.board_name, params.boardName);
    const taskName = pickFirstString(params.task_name, params.card_name, params.taskName, params.cardName);
    const dueDate = pickFirstString(params.due_date, params.dueDate);
    if (!taskName || !dueDate) {
        throw new Error('Les paramètres "task_name" (ou "card_name") et "due_date" sont requis pour updateTrelloDueDate');
    }
    const updated = await trelloService.updateDueDate({
        board,
        task_name: taskName,
        due_date: dueDate,
    });
    return {
        message: `Date d'échéance de "${updated.name}" mise à jour`,
        data: updated,
    };
}
async function archiveTrelloTask(params) {
    const trelloService = getTrelloServiceInstance();
    const board = pickFirstString(params.board, params.board_name, params.boardName);
    const taskName = pickFirstString(params.task_name, params.card_name, params.taskName, params.cardName);
    if (!taskName) {
        throw new Error('Le paramètre "task_name" (ou "card_name") est requis pour archiveTrelloTask');
    }
    const archived = await trelloService.archiveTask({
        board,
        task_name: taskName,
    });
    return {
        message: `Tâche "${archived.name}" archivée avec succès`,
        data: archived,
    };
}
async function moveTrelloTask(params) {
    const trelloService = getTrelloServiceInstance();
    const board = pickFirstString(params.board, params.board_name, params.boardName);
    const taskName = pickFirstString(params.task_name, params.card_name, params.taskName, params.cardName);
    const targetList = pickFirstString(params.target_list, params.list_name, params.listName, params.targetList);
    if (!taskName || !targetList) {
        throw new Error('Les paramètres "task_name" (ou "card_name") et "target_list" (ou "list_name") sont requis pour moveTrelloTask');
    }
    const moved = await trelloService.moveTask({
        board,
        task_name: taskName,
        target_list: targetList,
    });
    return {
        message: `Tâche "${moved.name}" déplacée vers "${targetList}"`,
        data: moved,
    };
}
async function getBoardActions(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const filters = parseFilters(params.filter);
    const limit = parseLimit(params.limit);
    const since = typeof params.since === 'string' ? params.since : undefined;
    const before = typeof params.before === 'string' ? params.before : undefined;
    const actions = await trelloService.getBoardActions({
        boardName,
        filter: filters,
        since,
        before,
        limit,
    });
    return {
        message: `Actions récupérées sur "${boardName}" (${actions.length})`,
        data: { actions },
    };
}
async function getCardActions(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const boardName = pickFirstString(params.board, params.board_name, params.boardName);
    const filters = parseFilters(params.filter);
    const limit = parseLimit(params.limit);
    const since = typeof params.since === 'string' ? params.since : undefined;
    const before = typeof params.before === 'string' ? params.before : undefined;
    const actions = await trelloService.getCardActions({
        cardName,
        board: boardName,
        filter: filters,
        since,
        before,
        limit,
    });
    return {
        message: `Actions récupérées pour la carte "${cardName}" (${actions.length})`,
        data: { actions },
    };
}
async function improveCardDescription(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const instructions = typeof params.instructions === 'string' ? params.instructions : undefined;
    const result = await trelloService.improveCardDescription({
        cardName,
        instructions,
    });
    return {
        message: `Description améliorée pour "${cardName}"`,
        data: result,
    };
}
async function updateCardField(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const field = ensureString(typeof params.field === 'string' ? params.field : undefined, 'field');
    if (typeof params.value === 'undefined' || params.value === null) {
        throw new Error('Le paramètre "value" est requis pour updateCardField');
    }
    const value = String(params.value);
    const update = await trelloService.updateCardField({
        cardName,
        field,
        value,
    });
    return {
        message: `Champ "${field}" mis à jour sur "${cardName}"`,
        data: update,
    };
}
async function moveCardToList(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const listName = ensureString(pickFirstString(params.list_name, params.listName), 'list_name');
    const moved = await trelloService.moveCardToList({
        cardName,
        listName,
    });
    return {
        message: `Carte déplacée : "${cardName}" → liste "${listName}"`,
        data: moved,
    };
}
async function deleteCard(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const deleted = await trelloService.deleteCard({ cardName });
    return {
        message: `Carte supprimée : "${cardName}"`,
        data: deleted,
    };
}
async function archiveCard(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const archived = await trelloService.archiveCard({ cardName });
    return {
        message: `Carte archivée : "${cardName}"`,
        data: archived,
    };
}
async function createChecklist(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const checklistName = ensureString(pickFirstString(params.checklist_name, params.checklistName), 'checklist_name');
    const items = parseItems(params.items);
    const checklist = await trelloService.createChecklist({
        cardName,
        checklistName,
        items,
    });
    return {
        message: `Checklist "${checklistName}" créée sur la carte "${cardName}"`,
        data: checklist,
    };
}
async function addChecklistItem(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const checklistName = ensureString(pickFirstString(params.checklist_name, params.checklistName), 'checklist_name');
    const itemName = ensureString(pickFirstString(params.item_name, params.itemName), 'item_name');
    const item = await trelloService.addChecklistItem({
        cardName,
        checklistName,
        itemName,
    });
    return {
        message: `Item "${itemName}" ajouté dans la checklist "${checklistName}"`,
        data: item,
    };
}
async function checkChecklistItem(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const checklistName = ensureString(pickFirstString(params.checklist_name, params.checklistName), 'checklist_name');
    const itemName = ensureString(pickFirstString(params.item_name, params.itemName), 'item_name');
    const item = await trelloService.checkChecklistItem({
        cardName,
        checklistName,
        itemName,
    });
    return {
        message: `Item "${itemName}" coché dans la checklist "${checklistName}"`,
        data: item,
    };
}
async function addLabel(params) {
    const trelloService = getTrelloServiceInstance();
    const cardName = ensureString(pickFirstString(params.card_name, params.cardName), 'card_name');
    const labelNameOrColor = ensureString(pickFirstString(params.label_name_or_color, params.labelNameOrColor), 'label_name_or_color');
    const label = await trelloService.addLabel({
        cardName,
        labelNameOrColor,
    });
    return {
        message: `Label "${labelNameOrColor}" ajouté à la carte "${cardName}"`,
        data: label,
    };
}
async function shiftDueDates(params) {
    const trelloService = getTrelloServiceInstance();
    const listName = ensureString(pickFirstString(params.list_name, params.listName), 'list_name');
    const days = parseDays(params.days);
    const shifted = await trelloService.shiftDueDates({
        listName,
        days,
    });
    return {
        message: `Décalage de ${days} jours appliqué à la liste "${listName}"`,
        data: { shifted },
    };
}
async function listBoardLabels(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const labels = await trelloService.listBoardLabels({
        boardName,
    });
    return {
        message: `Labels récupérés pour le board "${boardName}" (${labels.length})`,
        data: { labels },
    };
}
async function listOverdueTasks(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const overdue = await trelloService.listOverdueTasks({
        boardName,
    });
    return {
        message: `Tâches en retard récupérées pour le board "${boardName}" (${overdue.length})`,
        data: { overdue },
    };
}
async function sortListByDueDate(params) {
    const trelloService = getTrelloServiceInstance();
    const listName = ensureString(pickFirstString(params.list_name, params.listName), 'list_name');
    const order = params.order === 'desc' || params.order === 'asc' ? params.order : 'asc';
    const sorted = await trelloService.sortListByDueDate({
        listName,
        order,
    });
    return {
        message: `Liste "${listName}" triée par date (${order}).`,
        data: { sorted },
    };
}
async function prioritizeList(params) {
    const trelloService = getTrelloServiceInstance();
    const listName = ensureString(pickFirstString(params.list_name, params.listName), 'list_name');
    const prioritized = await trelloService.prioritizeList({
        listName,
    });
    return {
        message: `Liste "${listName}" réorganisée selon la priorité.`,
        data: { prioritized },
    };
}
async function groupCards(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const criteria = ensureAllowedCriteria(params.criteria);
    const groups = await trelloService.groupCards({
        boardName,
        criteria,
    });
    return {
        message: `Cartes groupées selon le critère "${criteria}"`,
        data: groups,
    };
}
async function getBoardSnapshot(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const snapshot = await trelloService.getBoardSnapshot(boardName);
    return {
        message: `Snapshot récupéré pour le board "${boardName}"`,
        data: snapshot,
    };
}
async function analyzeBoardHealth(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const report = await trelloService.analyzeBoardHealth(boardName);
    return {
        message: `Audit réalisé sur le board "${boardName}"`,
        data: report,
    };
}
async function auditList(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const listName = ensureString(pickFirstString(params.list_name, params.listName), 'list_name');
    const report = await trelloService.auditList(boardName, listName);
    return {
        message: `Audit réalisé sur la liste "${listName}" du board "${boardName}"`,
        data: report,
    };
}
async function auditHistory(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const since = typeof params.since === 'string' ? params.since : undefined;
    const before = typeof params.before === 'string' ? params.before : undefined;
    const report = await trelloService.auditHistory({
        boardName,
        since,
        before,
    });
    return {
        message: `Audit d'historique réalisé pour le board "${boardName}"`,
        data: report,
    };
}
async function generateBoardSummary(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const report = await trelloService.generateBoardSummary(boardName);
    return {
        message: `Résumé exécutif généré pour le board "${boardName}"`,
        data: report,
    };
}
async function suggestBoardCleanup(params) {
    const trelloService = getTrelloServiceInstance();
    const boardName = ensureString(pickFirstString(params.board, params.board_name, params.boardName), 'board_name');
    const plan = await trelloService.suggestBoardCleanup(boardName);
    return {
        message: `Plan de nettoyage généré pour le board "${boardName}"`,
        data: plan,
    };
}
exports.trelloToolHandlers = {
    createTrelloTask,
    completeTrelloTask,
    updateTrelloDueDate,
    archiveTrelloTask,
    moveTrelloTask,
    getBoardActions,
    getCardActions,
    improveCardDescription,
    updateCardField,
    moveCardToList,
    deleteCard,
    archiveCard,
    createChecklist,
    addChecklistItem,
    checkChecklistItem,
    addLabel,
    shiftDueDates,
    listBoardLabels,
    listOverdueTasks,
    sortListByDueDate,
    prioritizeList,
    groupCards,
    getBoardSnapshot,
    analyzeBoardHealth,
    auditList,
    auditHistory,
    generateBoardSummary,
    suggestBoardCleanup,
};
