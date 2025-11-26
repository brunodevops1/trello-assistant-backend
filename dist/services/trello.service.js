"use strict";
/**
 * Service pour interagir avec l'API Trello
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrelloService = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("../utils/errors");
class TrelloService {
    constructor() {
        this.apiKey = process.env.TRELLO_API_KEY || '';
        this.apiToken = process.env.TRELLO_API_TOKEN || '';
        this.defaultBoardId = process.env.TRELLO_DEFAULT_BOARD_ID || '';
        if (!this.apiKey || !this.apiToken) {
            throw new Error('TRELLO_API_KEY et TRELLO_API_TOKEN doivent être définis');
        }
        this.client = axios_1.default.create({
            baseURL: 'https://api.trello.com/1',
            params: {
                key: this.apiKey,
                token: this.apiToken,
            },
        });
    }
    /**
     * Récupère un board par son nom ou ID
     */
    async getBoard(boardNameOrId) {
        const boardId = boardNameOrId || this.defaultBoardId;
        if (!boardId) {
            throw new Error('Aucun board spécifié et aucun board par défaut configuré');
        }
        try {
            // Si c'est déjà un ID (format: 24 caractères alphanumériques)
            if (/^[a-f0-9]{24}$/i.test(boardId)) {
                const response = await this.client.get(`/boards/${boardId}`);
                return response.data;
            }
            // Sinon, chercher par nom
            const response = await this.client.get('/members/me/boards', {
                params: {
                    filter: 'open',
                },
            });
            const board = response.data.find((b) => b.name === boardId);
            if (!board) {
                throw new errors_1.BoardNotFoundError(boardId);
            }
            return board;
        }
        catch (error) {
            if (error instanceof errors_1.BoardNotFoundError) {
                throw error;
            }
            if (error.response?.status === 404) {
                throw new errors_1.BoardNotFoundError(boardId);
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération du board: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Récupère une liste par son nom sur un board
     */
    async getList(boardId, listName) {
        try {
            const response = await this.client.get(`/boards/${boardId}/lists`, {
                params: {
                    filter: 'open',
                },
            });
            const list = response.data.find((l) => l.name === listName);
            if (!list) {
                throw new errors_1.ListNotFoundError(listName);
            }
            return list;
        }
        catch (error) {
            if (error instanceof errors_1.ListNotFoundError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération de la liste: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Recherche une carte par son nom sur un board
     */
    async findCardByName(boardId, taskName) {
        try {
            // Utiliser l'API de recherche Trello
            const response = await this.client.get('/search', {
                params: {
                    query: taskName,
                    modelTypes: 'cards',
                    idBoards: boardId,
                    card_fields: 'id,name,desc,due,dueComplete,idList,idBoard,labels',
                },
            });
            const cards = response.data.cards.filter((card) => card.name.toLowerCase() === taskName.toLowerCase());
            if (cards.length === 0) {
                throw new errors_1.TaskNotFoundError(taskName);
            }
            if (cards.length > 1) {
                throw new errors_1.MultipleTasksFoundError(taskName, cards.length);
            }
            return cards[0];
        }
        catch (error) {
            if (error instanceof errors_1.TaskNotFoundError || error instanceof errors_1.MultipleTasksFoundError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la recherche de la carte: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Crée une nouvelle tâche (carte) dans Trello
     */
    async createTask(params) {
        try {
            const board = await this.getBoard(params.board);
            const listName = params.list || 'Nouvelles taches';
            const list = await this.getList(board.id, listName);
            const cardData = {
                name: params.title,
                idList: list.id,
            };
            if (params.due_date) {
                cardData.due = params.due_date;
            }
            const response = await this.client.post('/cards', cardData);
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la création de la tâche: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Marque une tâche comme terminée
     * Stratégie: déplace la carte vers une liste "Terminé" et marque la due date comme complète
     */
    async completeTask(params) {
        try {
            const board = await this.getBoard(params.board);
            const card = await this.findCardByName(board.id, params.task_name);
            // Chercher la liste "Terminé" (variations possibles)
            const listNames = ['Terminé', 'Termine', 'Done', 'Fait', 'Completed'];
            let doneList = null;
            for (const listName of listNames) {
                try {
                    doneList = await this.getList(board.id, listName);
                    break;
                }
                catch {
                    // Continuer à chercher
                }
            }
            // Si pas de liste "Terminé", créer la carte comme complète sans déplacer
            const updates = {
                dueComplete: true,
            };
            if (doneList) {
                updates.idList = doneList.id;
            }
            const response = await this.client.put(`/cards/${card.id}`, updates);
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la complétion de la tâche: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Met à jour la date d'échéance d'une tâche
     */
    async updateDueDate(params) {
        try {
            const board = await this.getBoard(params.board);
            const card = await this.findCardByName(board.id, params.task_name);
            const response = await this.client.put(`/cards/${card.id}`, {
                due: params.due_date,
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la mise à jour de la date: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Archive une tâche (la ferme sans la supprimer)
     */
    async archiveTask(params) {
        try {
            const board = await this.getBoard(params.board);
            const card = await this.findCardByName(board.id, params.task_name);
            const response = await this.client.put(`/cards/${card.id}`, {
                closed: true,
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de l'archivage de la tâche: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Déplace une tâche d'une liste à une autre
     */
    async moveTask(params) {
        try {
            const board = await this.getBoard(params.board);
            const card = await this.findCardByName(board.id, params.task_name);
            const targetList = await this.getList(board.id, params.target_list);
            const response = await this.client.put(`/cards/${card.id}`, {
                idList: targetList.id,
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors du déplacement de la tâche: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Récupère les actions d'un board
     */
    async getBoardActions(options) {
        const { boardName, filter, since, before, limit } = options;
        if (!boardName) {
            throw new errors_1.TrelloError('Le nom du board est requis pour récupérer les actions');
        }
        try {
            const board = await this.getBoard(boardName);
            const params = {};
            const sanitizedFilters = filter
                ?.map((value) => value?.trim())
                .filter((value) => Boolean(value)) || [];
            if (sanitizedFilters.length > 0) {
                params.filter = sanitizedFilters.join(',');
            }
            if (since) {
                params.since = since;
            }
            if (before) {
                params.before = before;
            }
            if (typeof limit === 'number') {
                params.limit = limit;
            }
            const response = await this.client.get(`/boards/${board.id}/actions`, {
                params,
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération des actions du board: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Récupère les actions d'une carte
     */
    async getCardActions(options) {
        const { cardName, board, filter, since, before, limit } = options;
        if (!cardName) {
            throw new errors_1.TrelloError('Le nom de la carte est requis pour récupérer ses actions');
        }
        try {
            const boardData = await this.getBoard(board);
            const card = await this.findCardByName(boardData.id, cardName);
            const params = {};
            const sanitizedFilters = filter
                ?.map((value) => value?.trim())
                .filter((value) => Boolean(value)) || [];
            if (sanitizedFilters.length > 0) {
                params.filter = sanitizedFilters.join(',');
            }
            if (since) {
                params.since = since;
            }
            if (before) {
                params.before = before;
            }
            if (typeof limit === 'number') {
                params.limit = limit;
            }
            const response = await this.client.get(`/cards/${card.id}/actions`, {
                params,
            });
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération des actions de la carte: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Améliore la description d'une carte en utilisant OpenAI
     */
    async improveCardDescription(options) {
        const { cardName, instructions } = options;
        if (!cardName) {
            throw new errors_1.TrelloError('Le nom de la carte est requis pour améliorer la description');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            const cardResponse = await this.client.get(`/cards/${card.id}`, {
                params: {
                    fields: 'desc',
                },
            });
            const currentDescription = cardResponse.data.desc || '';
            const openaiModule = await Promise.resolve().then(() => __importStar(require('./openai.service')));
            const OpenAIService = openaiModule.OpenAIService || openaiModule.default;
            if (!OpenAIService) {
                throw new errors_1.TrelloError("Le service OpenAI n'est pas disponible pour améliorer la description.");
            }
            const openaiService = new OpenAIService();
            const promptSections = [
                "Voici la description d'une carte Trello. Améliore-la selon les instructions éventuelles.",
                'Ne change pas le sens. Retourne uniquement la nouvelle description.',
                `Description actuelle:\n${currentDescription || '(vide)'}`,
            ];
            if (instructions && instructions.trim().length > 0) {
                promptSections.push(`Instructions supplémentaires:\n${instructions.trim()}`);
            }
            const prompt = promptSections.join('\n\n');
            const improvedDescription = (await openaiService.generateText(prompt)).trim();
            if (!improvedDescription) {
                throw new errors_1.TrelloError('La description générée est vide.');
            }
            await this.client.put(`/cards/${card.id}`, {
                desc: improvedDescription,
            });
            return { updated: improvedDescription };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de l'amélioration de la description: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Met à jour un champ arbitraire d'une carte Trello
     */
    async updateCardField(options) {
        const { cardName, field, value } = options;
        if (!cardName || !field || typeof value === 'undefined') {
            throw new errors_1.TrelloError('Les champs "cardName", "field" et "value" sont requis pour updateCardField');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            await this.client.put(`/cards/${card.id}`, {
                [field]: value,
            });
            return {
                cardName,
                field,
                value,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la mise à jour du champ "${field}": ${error.message}`, error.response?.status);
        }
    }
    /**
     * Déplace une carte dans une autre liste
     */
    async moveCardToList(options) {
        const { cardName, listName } = options;
        if (!cardName || !listName) {
            throw new errors_1.TrelloError('Les champs "cardName" et "listName" sont requis.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            const cardResponse = await this.client.get(`/cards/${card.id}`, {
                params: {
                    fields: 'idList,idBoard,name',
                },
            });
            const oldListResponse = await this.client.get(`/lists/${cardResponse.data.idList}`);
            const targetList = await this.getList(cardResponse.data.idBoard, listName);
            await this.client.put(`/cards/${card.id}`, {
                idList: targetList.id,
            });
            return {
                cardName: cardResponse.data.name,
                oldList: oldListResponse.data.name,
                newList: targetList.name,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors du déplacement de la carte: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Supprime définitivement une carte Trello
     */
    async deleteCard(options) {
        const { cardName } = options;
        if (!cardName) {
            throw new errors_1.TrelloError('Le champ "cardName" est requis pour supprimer une carte.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            await this.client.delete(`/cards/${card.id}`);
            return {
                cardName,
                deleted: true,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la suppression de la carte: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Archive une carte Trello (closed = true)
     */
    async archiveCard(options) {
        const { cardName } = options;
        if (!cardName) {
            throw new errors_1.TrelloError('Le champ "cardName" est requis pour archiver une carte.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            await this.client.put(`/cards/${card.id}`, {
                closed: true,
            });
            return {
                cardName,
                archived: true,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de l'archivage de la carte: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Crée une checklist sur une carte Trello
     */
    async createChecklist(options) {
        const { cardName, checklistName, items = [] } = options;
        if (!cardName || !checklistName) {
            throw new errors_1.TrelloError('Les champs "cardName" et "checklistName" sont requis.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            const checklistResponse = await this.client.post(`/cards/${card.id}/checklists`, {
                name: checklistName,
            });
            const checklistId = checklistResponse.data.id;
            const createdItems = [];
            for (const item of items) {
                const trimmed = typeof item === 'string' ? item.trim() : '';
                if (!trimmed)
                    continue;
                await this.client.post(`/checklists/${checklistId}/checkItems`, {
                    name: trimmed,
                });
                createdItems.push(trimmed);
            }
            return {
                cardName,
                checklistName,
                checklistId,
                items: createdItems,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la création de la checklist: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Ajoute un item dans une checklist existante
     */
    async addChecklistItem(options) {
        const { cardName, checklistName, itemName } = options;
        if (!cardName || !checklistName || !itemName) {
            throw new errors_1.TrelloError('Les champs "cardName", "checklistName" et "itemName" sont requis.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            const checklistsResponse = await this.client.get(`/cards/${card.id}/checklists`);
            const checklist = checklistsResponse.data.find((list) => list.name.toLowerCase() === checklistName.toLowerCase());
            if (!checklist) {
                throw new errors_1.ListNotFoundError(checklistName, cardName);
            }
            const itemResponse = await this.client.post(`/checklists/${checklist.id}/checkItems`, {
                name: itemName,
            });
            return {
                cardName,
                checklistName,
                itemName,
                checklistId: checklist.id,
                itemId: itemResponse.data.id,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de l'ajout de l'item dans la checklist: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Coche un item dans une checklist
     */
    async checkChecklistItem(options) {
        const { cardName, checklistName, itemName } = options;
        if (!cardName || !checklistName || !itemName) {
            throw new errors_1.TrelloError('Les champs "cardName", "checklistName" et "itemName" sont requis.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            const checklistsResponse = await this.client.get(`/cards/${card.id}/checklists`);
            const checklist = checklistsResponse.data.find((list) => list.name.toLowerCase() === checklistName.toLowerCase());
            if (!checklist) {
                throw new errors_1.ListNotFoundError(checklistName, cardName);
            }
            const item = checklist.checkItems.find((checkItem) => checkItem.name.toLowerCase() === itemName.toLowerCase());
            if (!item) {
                throw new errors_1.TaskNotFoundError(itemName, checklistName);
            }
            await this.client.put(`/cards/${card.id}/checkItem/${item.id}`, {
                state: 'complete',
            });
            return {
                cardName,
                checklistName,
                itemName,
                checklistId: checklist.id,
                itemId: item.id,
                state: 'complete',
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors du passage de l'item à l'état complété: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Ajoute un label existant à une carte Trello
     */
    async addLabel(options) {
        const { cardName, labelNameOrColor } = options;
        if (!cardName || !labelNameOrColor) {
            throw new errors_1.TrelloError('Les champs "cardName" et "labelNameOrColor" sont requis.');
        }
        try {
            const board = await this.getBoard();
            const card = await this.findCardByName(board.id, cardName);
            const labelsResponse = await this.client.get(`/boards/${card.idBoard}/labels`);
            const normalized = labelNameOrColor.toLowerCase();
            const label = labelsResponse.data.find((candidate) => candidate.name?.toLowerCase() === normalized) ||
                labelsResponse.data.find((candidate) => candidate.color?.toLowerCase() === normalized);
            if (!label) {
                throw new errors_1.LabelNotFoundError(labelNameOrColor, board.name);
            }
            await this.client.post(`/cards/${card.id}/idLabels`, {
                value: label.id,
            });
            return {
                cardName,
                labelId: label.id,
                labelName: label.name,
                labelColor: label.color,
                attached: true,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de l'ajout du label: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Liste les labels d'un board
     */
    async listBoardLabels(options) {
        const { boardName } = options;
        if (!boardName) {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour lister les labels.');
        }
        try {
            const board = await this.getBoard(boardName);
            const response = await this.client.get(`/boards/${board.id}/labels`);
            return response.data;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération des labels: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Décale les dates d'échéance de toutes les cartes d'une liste
     */
    async shiftDueDates(options) {
        const { listName, days } = options;
        if (!listName || typeof days !== 'number' || Number.isNaN(days)) {
            throw new errors_1.TrelloError('Les champs "listName" et "days" (nombre) sont requis pour décaler les échéances.');
        }
        try {
            const board = await this.getBoard();
            const list = await this.getList(board.id, listName);
            const cardsResponse = await this.client.get(`/lists/${list.id}/cards`, {
                params: {
                    fields: 'name,due',
                },
            });
            const offsetMs = days * 24 * 60 * 60 * 1000;
            const shifted = [];
            for (const card of cardsResponse.data) {
                if (!card.due) {
                    continue;
                }
                const currentDue = new Date(card.due);
                if (Number.isNaN(currentDue.getTime())) {
                    continue;
                }
                const newDue = new Date(currentDue.getTime() + offsetMs).toISOString();
                await this.client.put(`/cards/${card.id}`, {
                    due: newDue,
                });
                shifted.push({
                    cardName: card.name,
                    oldDue: card.due,
                    newDue,
                });
            }
            return shifted;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors du décalage des échéances: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Liste toutes les tâches en retard sur un board
     */
    async listOverdueTasks(options) {
        const { boardName } = options;
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour lister les retards.');
        }
        try {
            const board = await this.getBoard(boardName);
            const listsResponse = await this.client.get(`/boards/${board.id}/lists`, {
                params: {
                    filter: 'open',
                },
            });
            const now = Date.now();
            const overdueTasks = [];
            for (const list of listsResponse.data) {
                const cardsResponse = await this.client.get(`/lists/${list.id}/cards`, {
                    params: {
                        fields: 'name,due,dueComplete',
                    },
                });
                for (const card of cardsResponse.data) {
                    if (!card.due || card.dueComplete) {
                        continue;
                    }
                    const dueDate = new Date(card.due);
                    if (Number.isNaN(dueDate.getTime()) || dueDate.getTime() >= now) {
                        continue;
                    }
                    const overdueByDays = Math.floor((now - dueDate.getTime()) / (24 * 60 * 60 * 1000));
                    overdueTasks.push({
                        cardName: card.name,
                        listName: list.name,
                        due: card.due,
                        overdueByDays,
                    });
                }
            }
            return overdueTasks;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération des tâches en retard: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Trie les cartes d'une liste selon leur due date
     */
    async sortListByDueDate(options) {
        const { listName, order } = options;
        if (!listName || typeof listName !== 'string') {
            throw new errors_1.TrelloError('Le champ "listName" est requis pour trier une liste.');
        }
        const normalizedOrder = order === 'desc' ? 'desc' : 'asc';
        try {
            const board = await this.getBoard();
            const list = await this.getList(board.id, listName);
            const cardsResponse = await this.client.get(`/lists/${list.id}/cards`, {
                params: {
                    fields: 'name,due',
                },
            });
            const cardsWithDue = cardsResponse.data
                .filter((card) => !!card.due)
                .map((card) => ({
                ...card,
                dueDate: new Date(card.due),
            }))
                .filter((card) => !Number.isNaN(card.dueDate.getTime()));
            cardsWithDue.sort((a, b) => {
                if (normalizedOrder === 'asc') {
                    return a.dueDate.getTime() - b.dueDate.getTime();
                }
                return b.dueDate.getTime() - a.dueDate.getTime();
            });
            const sorted = [];
            for (let index = 0; index < cardsWithDue.length; index++) {
                const card = cardsWithDue[index];
                const newPos = index + 1;
                await this.client.put(`/cards/${card.id}`, {
                    pos: newPos,
                });
                sorted.push({
                    cardName: card.name,
                    due: card.due,
                    newPos,
                });
            }
            return sorted;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors du tri des cartes: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Réorganise une liste selon un score intelligent de priorité
     */
    async prioritizeList(options) {
        const { listName } = options;
        if (!listName || typeof listName !== 'string') {
            throw new errors_1.TrelloError('Le champ "listName" est requis pour prioriser une liste.');
        }
        try {
            const board = await this.getBoard();
            const list = await this.getList(board.id, listName);
            const cardsResponse = await this.client.get(`/lists/${list.id}/cards`, {
                params: {
                    fields: 'name,due,dueComplete,labels',
                },
            });
            const now = Date.now();
            const highPriorityLabels = ['urgent', 'p1', 'priority', 'haute priorité'];
            const highPriorityColors = ['red'];
            const scoredCards = cardsResponse.data.map((card) => {
                let score = 0;
                const dueDate = card.due ? new Date(card.due) : null;
                if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now) {
                    score += 100;
                }
                const hasHighPriorityLabel = card.labels.some((label) => {
                    const name = label.name?.toLowerCase();
                    const color = label.color?.toLowerCase();
                    return ((name && highPriorityLabels.includes(name)) ||
                        (color && highPriorityColors.includes(color)));
                });
                if (hasHighPriorityLabel) {
                    score += 50;
                }
                if (dueDate &&
                    !Number.isNaN(dueDate.getTime()) &&
                    dueDate.getTime() >= now &&
                    dueDate.getTime() - now <= 48 * 60 * 60 * 1000) {
                    score += 30;
                }
                if (!dueDate) {
                    score += 10;
                }
                return { card, score, dueDate };
            });
            scoredCards.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                if (a.dueDate && b.dueDate) {
                    return a.dueDate.getTime() - b.dueDate.getTime();
                }
                if (a.dueDate && !b.dueDate) {
                    return -1;
                }
                if (!a.dueDate && b.dueDate) {
                    return 1;
                }
                return 0;
            });
            const prioritized = [];
            for (let index = 0; index < scoredCards.length; index++) {
                const { card, score } = scoredCards[index];
                const newPos = index + 1;
                await this.client.put(`/cards/${card.id}`, {
                    pos: newPos,
                });
                prioritized.push({
                    cardName: card.name,
                    due: card.due,
                    priorityScore: score,
                    newPos,
                });
            }
            return prioritized;
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la priorisation de la liste: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Regroupe les cartes d'un board selon un critère et les déplace dans les listes correspondantes
     */
    async groupCards(options) {
        const { boardName, criteria } = options;
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour grouper les cartes.');
        }
        if (!['label', 'member', 'due'].includes(criteria)) {
            throw new errors_1.TrelloError('Le critère fourni est invalide.');
        }
        try {
            const board = await this.getBoard(boardName);
            const listsResponse = await this.client.get(`/boards/${board.id}/lists`, {
                params: { filter: 'open' },
            });
            const allLists = listsResponse.data;
            const listMap = new Map(allLists.map((list) => [list.id, list]));
            const cardsByGroup = {};
            const memberNameCache = new Map();
            for (const list of allLists) {
                const cardsResponse = await this.client.get(`/lists/${list.id}/cards`, {
                    params: {
                        fields: 'name,due,idList,labels,idMembers',
                    },
                });
                for (const card of cardsResponse.data) {
                    const listBefore = list.name;
                    let groupNames = [];
                    if (criteria === 'label') {
                        if (!card.labels || card.labels.length === 0) {
                            groupNames = ['No Label'];
                        }
                        else {
                            groupNames = card.labels.map((label) => {
                                if (label.name && label.name.trim().length > 0) {
                                    return label.name;
                                }
                                return label.color ? label.color : 'No Label';
                            });
                        }
                    }
                    else if (criteria === 'member') {
                        if (!card.idMembers || card.idMembers.length === 0) {
                            groupNames = ['Unassigned'];
                        }
                        else {
                            groupNames = card.idMembers;
                        }
                    }
                    else if (criteria === 'due') {
                        if (!card.due) {
                            groupNames = ['No Due Date'];
                        }
                        else {
                            const dueDate = new Date(card.due);
                            if (Number.isNaN(dueDate.getTime())) {
                                groupNames = ['No Due Date'];
                            }
                            else {
                                const now = new Date();
                                const diffMs = dueDate.getTime() - now.getTime();
                                const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                if (dueDate.getTime() < now.getTime()) {
                                    groupNames = ['Overdue'];
                                }
                                else if (dueDate.toDateString() === now.toDateString()) {
                                    groupNames = ['Today'];
                                }
                                else if (diffDays <= 7) {
                                    groupNames = ['This Week'];
                                }
                                else {
                                    groupNames = ['Later'];
                                }
                            }
                        }
                    }
                    for (const groupName of groupNames) {
                        if (!cardsByGroup[groupName]) {
                            cardsByGroup[groupName] = [];
                        }
                        cardsByGroup[groupName].push({ card, listBefore });
                    }
                }
            }
            const groupLists = new Map();
            for (const list of allLists) {
                groupLists.set(list.name, list);
            }
            const ensureListForGroup = async (groupName) => {
                if (groupLists.has(groupName)) {
                    return groupLists.get(groupName);
                }
                const response = await this.client.post('/lists', {
                    name: groupName,
                    idBoard: board.id,
                });
                groupLists.set(groupName, response.data);
                return response.data;
            };
            const groups = [];
            for (const [groupName, entries] of Object.entries(cardsByGroup)) {
                const targetList = await ensureListForGroup(groupName);
                const cardsInfo = [];
                for (const entry of entries) {
                    await this.client.put(`/cards/${entry.card.id}`, {
                        idList: targetList.id,
                    });
                    let displayName = groupName;
                    if (criteria === 'member' && groupName !== 'Unassigned') {
                        if (!memberNameCache.has(groupName)) {
                            const memberResponse = await this.client.get(`/members/${groupName}`, {
                                params: {
                                    fields: 'fullName',
                                },
                            });
                            memberNameCache.set(groupName, memberResponse.data.fullName);
                        }
                        displayName = memberNameCache.get(groupName);
                    }
                    cardsInfo.push({
                        cardName: entry.card.name,
                        listBefore: entry.listBefore,
                        listAfter: displayName,
                    });
                }
                groups.push({
                    groupName: criteria === 'member' && groupName !== 'Unassigned'
                        ? memberNameCache.get(groupName) || groupName
                        : groupName,
                    cardCount: cardsInfo.length,
                    cards: cardsInfo,
                });
            }
            return {
                criteria,
                groups,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors du regroupement des cartes: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Récupère un snapshot complet d'un board Trello
     */
    async getBoardSnapshot(boardName) {
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour le snapshot.');
        }
        try {
            const board = await this.getBoard(boardName);
            const listsResponse = await this.client.get(`/boards/${board.id}/lists`, { params: { filter: 'open' } });
            const now = new Date();
            const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const stats = {
                totalCards: 0,
                overdue: 0,
                dueToday: 0,
                dueThisWeek: 0,
                noDue: 0,
                unassigned: 0,
                withChecklists: 0,
                completedChecklists: 0,
            };
            const snapshotLists = [];
            for (const list of listsResponse.data) {
                const cardsResponse = await this.client.get(`/lists/${list.id}/cards`, {
                    params: {
                        fields: 'name,desc,due,dueComplete,labels,idMembers',
                        members: true,
                        member_fields: 'fullName,username',
                        checklists: 'all',
                    },
                });
                const snapshotCards = cardsResponse.data.map((card) => {
                    stats.totalCards += 1;
                    if (!card.due) {
                        stats.noDue += 1;
                    }
                    else {
                        const dueDate = new Date(card.due);
                        if (!Number.isNaN(dueDate.getTime())) {
                            if (!card.dueComplete && dueDate.getTime() < now.getTime()) {
                                stats.overdue += 1;
                            }
                            if (dueDate.toDateString() === now.toDateString()) {
                                stats.dueToday += 1;
                            }
                            else if (dueDate.getTime() > now.getTime() &&
                                dueDate.getTime() <= weekAhead.getTime()) {
                                stats.dueThisWeek += 1;
                            }
                        }
                        else {
                            stats.noDue += 1;
                        }
                    }
                    if (!card.members || card.members.length === 0) {
                        stats.unassigned += 1;
                    }
                    const formattedChecklists = card.checklists?.map((checklist) => ({
                        id: checklist.id,
                        name: checklist.name,
                        items: checklist.checkItems?.map((item) => ({
                            id: item.id,
                            name: item.name,
                            state: item.state,
                        })) || [],
                    })) || [];
                    if (formattedChecklists.length > 0) {
                        stats.withChecklists += 1;
                        formattedChecklists.forEach((checklist) => {
                            if (checklist.items.length > 0 &&
                                checklist.items.every((item) => item.state === 'complete')) {
                                stats.completedChecklists += 1;
                            }
                        });
                    }
                    return {
                        id: card.id,
                        name: card.name,
                        desc: card.desc,
                        due: card.due,
                        dueComplete: card.dueComplete,
                        labels: card.labels || [],
                        members: card.members || [],
                        checklists: formattedChecklists,
                    };
                });
                snapshotLists.push({
                    id: list.id,
                    name: list.name,
                    cards: snapshotCards,
                });
            }
            return {
                boardName: board.name,
                boardId: board.id,
                lists: snapshotLists,
                stats,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la récupération du snapshot: ${error.message}`, error.response?.status);
        }
    }
    /**
     * Analyse la santé d'un board Trello en s'appuyant sur le snapshot
     */
    async analyzeBoardHealth(boardName) {
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour l’audit.');
        }
        const snapshot = await this.getBoardSnapshot(boardName);
        const now = new Date();
        const soonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const stalledThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const problems = [];
        const recommendations = [];
        const recommendationSet = new Set();
        const addProblem = (type, card, listName, details) => {
            problems.push({
                type,
                cardId: card.id,
                cardName: card.name,
                listName,
                details,
            });
        };
        const addRecommendation = (action, card, listName, suggestedValue) => {
            const key = `${action}-${card?.id ?? listName}`;
            if (recommendationSet.has(key)) {
                return;
            }
            recommendationSet.add(key);
            recommendations.push({
                action,
                cardId: card?.id,
                listName,
                suggestedValue,
            });
        };
        let actionsMap = new Map();
        try {
            const actions = await this.getBoardActions({
                boardName,
                filter: ['updateCard', 'commentCard'],
            });
            actions.forEach((action) => {
                const cardId = action.data?.card?.id;
                if (!cardId || !action.date) {
                    return;
                }
                const actionDate = new Date(action.date);
                if (Number.isNaN(actionDate.getTime())) {
                    return;
                }
                const existing = actionsMap.get(cardId);
                if (!existing || actionDate > existing) {
                    actionsMap.set(cardId, actionDate);
                }
            });
        }
        catch (error) {
            console.warn('Impossible de récupérer les actions récentes pour l’audit.', error);
        }
        for (const list of snapshot.lists) {
            for (const card of list.cards) {
                const dueDate = card.due ? new Date(card.due) : null;
                if (dueDate && !Number.isNaN(dueDate.getTime())) {
                    if (!card.dueComplete && dueDate.getTime() < now.getTime()) {
                        addProblem('overdue', card, list.name);
                        addRecommendation('shiftDueDates', card, list.name, { days: 3 });
                    }
                    else if (dueDate.getTime() >= now.getTime() &&
                        dueDate.getTime() <= soonThreshold.getTime()) {
                        addProblem('due_soon', card, list.name, { due: card.due });
                    }
                }
                else {
                    addProblem('no_due_date', card, list.name);
                    addRecommendation('addChecklistItem', card, list.name, {
                        itemName: "Définir une date d'échéance",
                    });
                }
                if (!card.members || card.members.length === 0) {
                    addProblem('unassigned', card, list.name);
                    addRecommendation('applyLabel', card, list.name, { label: 'À assigner' });
                }
                if (card.checklists &&
                    card.checklists.length > 0 &&
                    card.checklists.every((checklist) => !checklist.items || checklist.items.length === 0)) {
                    addProblem('empty_checklist', card, list.name);
                    addRecommendation('addChecklistItem', card, list.name, {
                        itemName: 'Ajouter étapes',
                    });
                }
                const lastActionDate = actionsMap.get(card.id);
                if (!lastActionDate || lastActionDate < stalledThreshold) {
                    addProblem('stalled', card, list.name, {
                        lastActivity: lastActionDate?.toISOString() || null,
                    });
                    addRecommendation('moveCardToList', card, list.name, {
                        targetList: 'En revue',
                    });
                }
                if (!card.labels || card.labels.length === 0) {
                    addProblem('no_label', card, list.name);
                    addRecommendation('applyLabel', card, list.name, { label: 'À catégoriser' });
                }
                else if (card.labels.length > 5) {
                    addProblem('too_many_labels', card, list.name, {
                        labelsCount: card.labels.length,
                    });
                }
                if (card.desc && card.desc.length > 2000) {
                    addProblem('long_description', card, list.name, {
                        length: card.desc.length,
                    });
                }
            }
        }
        const problemCount = problems.length;
        let health = 'good';
        if (problemCount > 10) {
            health = 'bad';
        }
        else if (problemCount >= 4) {
            health = 'medium';
        }
        return {
            boardName: snapshot.boardName,
            generatedAt: new Date().toISOString(),
            health,
            problems,
            recommendations,
        };
    }
    /**
     * Analyse la santé d'une liste spécifique
     */
    async auditList(boardName, listName) {
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour auditer une liste.');
        }
        if (!listName || typeof listName !== 'string') {
            throw new errors_1.TrelloError('Le champ "listName" est requis pour auditer une liste.');
        }
        const snapshot = await this.getBoardSnapshot(boardName);
        const targetList = snapshot.lists.find((list) => list.name.toLowerCase() === listName.toLowerCase());
        if (!targetList) {
            throw new errors_1.ListNotFoundError(listName, boardName);
        }
        const now = new Date();
        const soonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const stalledThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const problems = [];
        const recommendations = [];
        const recommendationSet = new Set();
        const addProblem = (type, card, details) => {
            problems.push({
                type,
                cardId: card.id,
                cardName: card.name,
                listName: targetList.name,
                details,
            });
        };
        const addRecommendation = (action, card, suggestedValue) => {
            const key = `${action}-${card.id}`;
            if (recommendationSet.has(key)) {
                return;
            }
            recommendationSet.add(key);
            recommendations.push({
                action,
                cardId: card.id,
                listName: targetList.name,
                suggestedValue,
            });
        };
        let actionsMap = new Map();
        try {
            const actions = await this.getBoardActions({
                boardName,
                filter: ['updateCard', 'commentCard'],
            });
            actions.forEach((action) => {
                const cardId = action.data?.card?.id;
                if (!cardId || !action.date) {
                    return;
                }
                const actionDate = new Date(action.date);
                if (Number.isNaN(actionDate.getTime())) {
                    return;
                }
                const existing = actionsMap.get(cardId);
                if (!existing || actionDate > existing) {
                    actionsMap.set(cardId, actionDate);
                }
            });
        }
        catch (error) {
            console.warn('Impossible de récupérer les actions récentes pour auditList.', error);
        }
        for (const card of targetList.cards) {
            const dueDate = card.due ? new Date(card.due) : null;
            if (dueDate && !Number.isNaN(dueDate.getTime())) {
                if (!card.dueComplete && dueDate.getTime() < now.getTime()) {
                    addProblem('overdue', card);
                    addRecommendation('shiftDueDates', card, { days: 3 });
                }
                else if (dueDate.getTime() >= now.getTime() &&
                    dueDate.getTime() <= soonThreshold.getTime()) {
                    addProblem('due_soon', card, { due: card.due });
                }
            }
            else {
                addProblem('no_due_date', card);
                addRecommendation('addChecklistItem', card, {
                    itemName: "Définir une date d'échéance",
                });
            }
            if (!card.members || card.members.length === 0) {
                addProblem('unassigned', card);
                addRecommendation('applyLabel', card, { label: 'À assigner' });
            }
            if (card.checklists &&
                card.checklists.length > 0 &&
                card.checklists.every((checklist) => !checklist.items || checklist.items.length === 0)) {
                addProblem('empty_checklist', card);
                addRecommendation('addChecklistItem', card, {
                    itemName: 'Ajouter étapes',
                });
            }
            const lastActionDate = actionsMap.get(card.id);
            if (!lastActionDate || lastActionDate < stalledThreshold) {
                addProblem('stalled', card, {
                    lastActivity: lastActionDate?.toISOString() || null,
                });
                addRecommendation('moveCardToList', card, { targetList: 'En revue' });
            }
            if (!card.labels || card.labels.length === 0) {
                addProblem('no_label', card);
                addRecommendation('applyLabel', card, { label: 'À catégoriser' });
            }
            else if (card.labels.length > 5) {
                addProblem('too_many_labels', card, { labelsCount: card.labels.length });
            }
            if (card.desc && card.desc.length > 2000) {
                addProblem('long_description', card, { length: card.desc.length });
            }
        }
        const problemCount = problems.length;
        let health = 'good';
        if (problemCount > 5) {
            health = 'bad';
        }
        else if (problemCount >= 2) {
            health = 'medium';
        }
        return {
            boardName: snapshot.boardName,
            listName: targetList.name,
            generatedAt: new Date().toISOString(),
            health,
            problems,
            recommendations,
        };
    }
    /**
     * Génère un plan de nettoyage du board
     */
    async auditHistory(options) {
        const { boardName, since, before } = options;
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour auditHistory.');
        }
        try {
            const [actions, snapshot] = await Promise.all([
                this.getBoardActions({
                    boardName,
                    since,
                    before,
                }),
                this.getBoardSnapshot(boardName),
            ]);
            const anomalies = [];
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const fortyEightHoursMs = 48 * 60 * 60 * 1000;
            const twentyOneDaysMs = 21 * 24 * 60 * 60 * 1000;
            const cardContext = new Map();
            snapshot.lists.forEach((list) => {
                list.cards.forEach((card) => {
                    if (card.id) {
                        cardContext.set(card.id, { name: card.name, listName: list.name });
                    }
                });
            });
            const sortedActions = actions
                .map((action) => ({
                action,
                timestamp: new Date(action.date).getTime(),
            }))
                .filter(({ timestamp }) => Number.isFinite(timestamp))
                .sort((a, b) => a.timestamp - b.timestamp);
            const cardLastAction = new Map();
            const cardFirstAction = new Map();
            const memberLastAction = new Map();
            const moveTimestamps = new Map();
            const dayActivity = new Map();
            for (const { action, timestamp } of sortedActions) {
                const cardId = action.data?.card?.id ||
                    action.data?.cardId ||
                    action.data?.card?.idCard ||
                    action.data?.card?.idShort;
                if (cardId) {
                    const currentLast = cardLastAction.get(cardId);
                    if (!currentLast || timestamp > currentLast) {
                        cardLastAction.set(cardId, timestamp);
                    }
                    const currentFirst = cardFirstAction.get(cardId);
                    if (!currentFirst || timestamp < currentFirst) {
                        cardFirstAction.set(cardId, timestamp);
                    }
                }
                const memberId = action.memberCreator?.id ||
                    action.memberCreator?._id ||
                    action.memberCreator?.username;
                if (memberId) {
                    const currentLast = memberLastAction.get(memberId);
                    if (!currentLast || timestamp > currentLast) {
                        memberLastAction.set(memberId, timestamp);
                    }
                }
                const dayKey = action.date.slice(0, 10);
                dayActivity.set(dayKey, (dayActivity.get(dayKey) || 0) + 1);
                if (cardId &&
                    action.type === 'updateCard' &&
                    action.data?.listAfter &&
                    action.data?.listBefore) {
                    const timestamps = moveTimestamps.get(cardId) || [];
                    timestamps.push(timestamp);
                    moveTimestamps.set(cardId, timestamps);
                }
            }
            // Cartes stagnantes (>7 jours sans action)
            for (const [cardId, context] of cardContext.entries()) {
                const lastActionTime = cardLastAction.get(cardId);
                if (!lastActionTime || lastActionTime < now - sevenDaysMs) {
                    anomalies.push({
                        type: 'stalled_card',
                        message: `La carte "${context.name}" n'a aucune activité depuis plus de 7 jours.`,
                        details: {
                            cardId,
                            cardName: context.name,
                            listName: context.listName,
                            lastActionAt: lastActionTime
                                ? new Date(lastActionTime).toISOString()
                                : null,
                        },
                    });
                }
            }
            // Membres inactifs (>7 jours)
            const boardMembers = new Map();
            snapshot.lists.forEach((list) => {
                list.cards.forEach((card) => {
                    if (Array.isArray(card.members)) {
                        card.members.forEach((member) => {
                            const identifier = member?.id || member?.idMember || member?.username;
                            const displayName = member?.fullName || member?.username || identifier;
                            if (identifier && displayName) {
                                boardMembers.set(identifier, displayName);
                            }
                        });
                    }
                });
            });
            for (const [memberId, memberName] of boardMembers.entries()) {
                const lastActionTime = memberLastAction.get(memberId);
                if (!lastActionTime || lastActionTime < now - sevenDaysMs) {
                    anomalies.push({
                        type: 'inactive_member',
                        message: `Le membre "${memberName}" est inactif depuis plus de 7 jours.`,
                        details: {
                            memberId,
                            memberName,
                            lastActionAt: lastActionTime
                                ? new Date(lastActionTime).toISOString()
                                : null,
                        },
                    });
                }
            }
            // Pics d'activité (>300% de la moyenne)
            if (dayActivity.size > 0) {
                const totalActions = actions.length;
                const averagePerDay = totalActions / dayActivity.size;
                dayActivity.forEach((count, day) => {
                    if (averagePerDay > 0 && count > averagePerDay * 3) {
                        anomalies.push({
                            type: 'high_activity_spike',
                            message: `Pic d'activité détecté le ${day} (${count} actions, moyenne ${averagePerDay.toFixed(1)}).`,
                            details: { day, count, average: averagePerDay },
                        });
                    }
                });
            }
            // Périodes sans activité (>48h entre deux actions)
            for (let i = 1; i < sortedActions.length; i += 1) {
                const previous = sortedActions[i - 1];
                const current = sortedActions[i];
                if (current.timestamp - previous.timestamp > fortyEightHoursMs) {
                    anomalies.push({
                        type: 'no_activity_period',
                        message: `Aucune action enregistrée entre ${previous.action.date} et ${current.action.date}.`,
                        details: {
                            start: previous.action.date,
                            end: current.action.date,
                        },
                    });
                }
            }
            if (sortedActions.length === 0) {
                anomalies.push({
                    type: 'no_activity_period',
                    message: 'Aucune action trouvée sur la période analysée.',
                    details: {
                        since,
                        before,
                    },
                });
            }
            // Déplacements trop fréquents (>5 en 48h)
            const frequentMoveCards = new Set();
            moveTimestamps.forEach((timestamps, cardId) => {
                const sorted = timestamps.sort((a, b) => a - b);
                let start = 0;
                for (let end = 0; end < sorted.length; end += 1) {
                    while (sorted[end] - sorted[start] > fortyEightHoursMs) {
                        start += 1;
                    }
                    const windowSize = end - start + 1;
                    if (windowSize > 5) {
                        frequentMoveCards.add(cardId);
                        break;
                    }
                }
            });
            frequentMoveCards.forEach((cardId) => {
                const context = cardContext.get(cardId);
                anomalies.push({
                    type: 'frequent_moves',
                    message: `La carte "${context?.name || cardId}" a été déplacée plus de 5 fois en 48h.`,
                    details: {
                        cardId,
                        cardName: context?.name,
                        listName: context?.listName,
                    },
                });
            });
            // Cycle time trop long (>21 jours)
            cardFirstAction.forEach((first, cardId) => {
                const last = cardLastAction.get(cardId);
                if (last && last - first > twentyOneDaysMs) {
                    const context = cardContext.get(cardId);
                    anomalies.push({
                        type: 'long_cycle_time',
                        message: `Le cycle de la carte "${context?.name || cardId}" dépasse 21 jours.`,
                        details: {
                            cardId,
                            cardName: context?.name,
                            listName: context?.listName,
                            cycleTimeDays: Math.round((last - first) / (24 * 60 * 60 * 1000)),
                        },
                    });
                }
            });
            return {
                boardName,
                generatedAt: new Date().toISOString(),
                periodAnalyzed: {
                    since,
                    before,
                    totalActions: actions.length,
                },
                anomalies,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de l'audit de l'historique: ${error.message}`, error.response?.status);
        }
    }
    async suggestBoardCleanup(boardName) {
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour le nettoyage.');
        }
        const snapshot = await this.getBoardSnapshot(boardName);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const suggestions = [];
        const addSuggestion = (type, message, actions) => {
            if (actions.length === 0) {
                return;
            }
            suggestions.push({
                type,
                message,
                actions,
            });
        };
        const archiveActions = [];
        const addDueActions = [];
        const labelActions = [];
        const emptyListActions = [];
        const rebalanceActions = [];
        const shiftOverdueActions = [];
        const addChecklistActions = [];
        for (const list of snapshot.lists) {
            if (list.cards.length === 0) {
                emptyListActions.push({
                    action: 'archiveList',
                    listName: list.name,
                });
            }
            for (const card of list.cards) {
                if (card.dueComplete && card.due) {
                    const dueDate = new Date(card.due);
                    if (!Number.isNaN(dueDate.getTime()) && dueDate < thirtyDaysAgo) {
                        archiveActions.push({
                            action: 'archiveCard',
                            cardId: card.id,
                            listName: list.name,
                        });
                    }
                }
                if (!card.due) {
                    addDueActions.push({
                        action: 'addChecklistItem',
                        cardId: card.id,
                        listName: list.name,
                        suggestedValue: {
                            itemName: "Définir une date d'échéance",
                        },
                    });
                }
                if (!card.labels || card.labels.length === 0) {
                    labelActions.push({
                        action: 'applyLabel',
                        cardId: card.id,
                        listName: list.name,
                        suggestedValue: { label: 'À catégoriser' },
                    });
                }
                if (card.due && !card.dueComplete) {
                    const dueDate = new Date(card.due);
                    if (!Number.isNaN(dueDate.getTime()) && dueDate < now) {
                        shiftOverdueActions.push({
                            action: 'shiftDueDates',
                            cardId: card.id,
                            listName: list.name,
                            suggestedValue: '+3d',
                        });
                    }
                }
                if (!card.checklists || card.checklists.length === 0) {
                    addChecklistActions.push({
                        action: 'addChecklistItem',
                        cardId: card.id,
                        listName: list.name,
                        suggestedValue: 'Définir le process',
                    });
                }
            }
        }
        const totalCards = snapshot.lists.reduce((sum, list) => sum + list.cards.length, 0);
        const averageCards = snapshot.lists.length
            ? totalCards / snapshot.lists.length
            : 0;
        const rebalanceThreshold = averageCards * 2;
        if (rebalanceThreshold > 0) {
            for (const list of snapshot.lists) {
                if (list.cards.length > rebalanceThreshold) {
                    list.cards.forEach((card) => {
                        rebalanceActions.push({
                            action: 'moveCardToList',
                            cardId: card.id,
                            listName: list.name,
                            suggestedValue: 'Backlog',
                        });
                    });
                }
            }
        }
        addSuggestion('archive_old_done_cards', 'Archiver les cartes terminées depuis plus de 30 jours.', archiveActions);
        addSuggestion('add_missing_due_dates', 'Ajouter des dates d’échéance aux cartes qui n’en ont pas.', addDueActions);
        addSuggestion('label_missing', 'Appliquer un label aux cartes non catégorisées.', labelActions);
        addSuggestion('cleanup_empty_lists', 'Archiver ou fusionner les listes vides.', emptyListActions);
        addSuggestion('rebalance_lists', 'Rééquilibrer les listes trop chargées vers Backlog.', rebalanceActions);
        addSuggestion('shift_overdue', 'Proposer un décalage de 3 jours pour les cartes en retard.', shiftOverdueActions);
        addSuggestion('add_checklist_for_missing_process', 'Ajouter une checklist de process aux cartes qui n’en ont pas.', addChecklistActions);
        return {
            boardName: snapshot.boardName,
            generatedAt: new Date().toISOString(),
            suggestions,
        };
    }
    /**
     * Génère un rapport exécutif complet du board (audit avancé + résumé GPT)
     */
    async generateBoardSummary(boardName) {
        if (!boardName || typeof boardName !== 'string') {
            throw new errors_1.TrelloError('Le champ "boardName" est requis pour le résumé exécutif.');
        }
        try {
            const [snapshot, healthReport, historyReport, cleanupPlan] = await Promise.all([
                this.getBoardSnapshot(boardName),
                this.analyzeBoardHealth(boardName),
                this.auditHistory({ boardName }),
                this.suggestBoardCleanup(boardName),
            ]);
            const dataForAi = {
                boardName,
                snapshot,
                healthReport,
                historyReport,
                cleanupPlan,
            };
            const instructions = [
                'Tu es un consultant Trello senior chargé de produire un rapport exécutif clair et actionnable.',
                'Analyse les données JSON fournies et construis un résumé destiné à une direction opérationnelle.',
                'Inclue impérativement : synthèse générale, problèmes majeurs, risques, points critiques, recommandations stratégiques, quick wins, points bloquants, plan d’action.',
                'Retourne STRICTEMENT un JSON respectant la structure suivante :',
                '{',
                '  "summary_text": "<texte narratif structuré>",',
                '  "key_findings": ["<point clé 1>", "<point clé 2>", "..."],',
                '  "action_items": ["<action prioritaire 1>", "<action prioritaire 2>", "..."]',
                '}',
                'Ne rajoute aucun commentaire en dehors du JSON.',
                `Données JSON à analyser :\n${JSON.stringify(dataForAi, null, 2)}`,
            ].join('\n\n');
            const openaiModule = await Promise.resolve().then(() => __importStar(require('./openai.service')));
            const OpenAIService = openaiModule.OpenAIService || openaiModule.default;
            if (!OpenAIService) {
                throw new errors_1.TrelloError("Le service OpenAI n'est pas disponible pour générer le résumé exécutif.");
            }
            const openaiService = new OpenAIService();
            const rawSummary = await openaiService.callModel(instructions, {
                systemPrompt: 'Tu es un consultant senior en gouvernance Trello. Tes réponses sont synthétiques, orientées décision, et toujours structurées.',
                temperature: 0.1,
            });
            let parsedSummary = null;
            const tryParse = (payload) => {
                try {
                    return JSON.parse(payload);
                }
                catch {
                    return null;
                }
            };
            parsedSummary = tryParse(rawSummary);
            if (!parsedSummary) {
                const jsonMatch = rawSummary.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedSummary = tryParse(jsonMatch[0]);
                }
            }
            const summaryText = typeof parsedSummary?.summary_text === 'string'
                ? parsedSummary.summary_text.trim()
                : rawSummary.trim();
            const toStringArray = (value) => {
                if (!Array.isArray(value)) {
                    return [];
                }
                return value
                    .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
                    .filter((item) => item.length > 0);
            };
            const keyFindings = toStringArray(parsedSummary?.key_findings || parsedSummary?.keyFindings);
            const actionItems = toStringArray(parsedSummary?.action_items || parsedSummary?.actionItems);
            return {
                boardName,
                generatedAt: new Date().toISOString(),
                snapshot,
                healthReport,
                historyReport,
                cleanupPlan,
                summaryText,
                keyFindings,
                actionItems,
            };
        }
        catch (error) {
            if (error instanceof errors_1.TrelloError) {
                throw error;
            }
            throw new errors_1.TrelloError(`Erreur lors de la génération du résumé exécutif: ${error.message}`, error.response?.status);
        }
    }
}
exports.TrelloService = TrelloService;
