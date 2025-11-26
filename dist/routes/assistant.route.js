"use strict";
/**
 * Route principale pour l'assistant Trello
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
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const trello_service_1 = require("../services/trello.service");
const trello_1 = require("../services/trello");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
const TOOLS_JSON_PATH = resolveToolsJsonPath();
console.log(`[tools.json] Definition served from: ${TOOLS_JSON_PATH}`);
const EXPRESS_TOOL_ROUTES = [
    'createTrelloTask',
    'completeTrelloTask',
    'updateTrelloDueDate',
    'archiveTrelloTask',
    'moveTrelloTask',
    'getBoardActions',
    'getCardActions',
    'improveCardDescription',
    'updateCardField',
    'moveCardToList',
    'deleteCard',
    'archiveCard',
    'createChecklist',
    'addChecklistItem',
    'checkChecklistItem',
    'addLabel',
    'shiftDueDates',
    'listBoardLabels',
    'listOverdueTasks',
    'sortListByDueDate',
    'prioritizeList',
    'groupCards',
    'getBoardSnapshot',
    'analyzeBoardHealth',
    'auditList',
    'auditHistory',
    'generateBoardSummary',
    'suggestBoardCleanup',
];
// Initialisation lazy du service Trello (après chargement des variables d'environnement)
let trelloServiceInstance = null;
function getTrelloService() {
    if (!trelloServiceInstance) {
        trelloServiceInstance = new trello_service_1.TrelloService();
    }
    return trelloServiceInstance;
}
/**
 * Middleware optionnel pour vérifier l'API key (si configurée)
 * Permet à ChatGPT de stocker la clé et éviter les demandes d'autorisation répétées
 */
function optionalApiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.CHATGPT_API_KEY;
    // Si une clé est attendue mais non fournie, on accepte quand même (pour compatibilité)
    // Mais on log pour debug
    if (expectedApiKey && apiKey !== expectedApiKey) {
        console.log('⚠️ API Key manquante ou invalide (requête acceptée pour compatibilité)');
    }
    next();
}
function resolveToolsJsonPath() {
    const projectRoot = path_1.default.resolve(__dirname, '..', '..');
    const candidates = [
        path_1.default.resolve(__dirname, '..', 'tools.json'), // dist build
        path_1.default.join(projectRoot, 'dist', 'tools.json'), // fallback to dist at root
        path_1.default.join(projectRoot, 'tools.json'), // final fallback for dev/test
    ];
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    console.error('[tools.json] Introuvable. Chemins testés:', candidates);
    return candidates[candidates.length - 1];
}
/**
 * POST /assistant/trello
 *
 * Accepte deux formats:
 * 1. { tool_calls: [...] } - Format direct depuis OpenAI (variante A)
 * 2. { message: "..." } - Message utilisateur brut (variante B, nécessite OPENAI_API_KEY)
 */
router.post('/trello', optionalApiKeyAuth, async (req, res) => {
    try {
        const { tool_calls, message } = req.body;
        // Variante A: tool_calls déjà parsés
        if (tool_calls && Array.isArray(tool_calls)) {
            const results = await executeToolCalls(tool_calls);
            return res.json({
                success: true,
                results,
            });
        }
        // Variante B: message brut à parser
        if (message && typeof message === 'string') {
            const { OpenAIService } = await Promise.resolve().then(() => __importStar(require('../services/openai.service')));
            const openaiService = new OpenAIService();
            const openaiResponse = await openaiService.parseUserMessage(message);
            const assistantMessage = openaiResponse.choices[0].message;
            if (assistantMessage.tool_calls) {
                const results = await executeToolCalls(assistantMessage.tool_calls);
                return res.json({
                    success: true,
                    results,
                    assistant_message: assistantMessage.content || null,
                });
            }
            return res.json({
                success: true,
                message: assistantMessage.content,
            });
        }
        return res.status(400).json({
            success: false,
            error: 'Requête invalide. Fournissez soit "tool_calls" soit "message".',
        });
    }
    catch (error) {
        console.error('Erreur dans /assistant/trello:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * @openapi
 * /assistant/health:
 *   get:
 *     summary: Vérifie l'état du backend Trello Assistant.
 *     responses:
 *       200:
 *         description: Backend opérationnel.
 */
router.get('/health', optionalApiKeyAuth, (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Trello Assistant backend is running',
    });
});
/**
 * @openapi
 * /assistant/createTrelloTask:
 *   post:
 *     summary: Crée une carte Trello dans un board et une liste donnés.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - board_name
 *               - list_name
 *               - card_name
 *             properties:
 *               board_name:
 *                 type: string
 *               list_name:
 *                 type: string
 *               card_name:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Carte créée avec succès.
 *       400:
 *         description: Paramètres manquants ou invalides.
 */
router.post('/createTrelloTask', optionalApiKeyAuth, async (req, res) => {
    try {
        const { board_name, list_name, card_name, due_date } = req.body || {};
        if (typeof board_name !== 'string' ||
            typeof list_name !== 'string' ||
            typeof card_name !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Les champs "board_name", "list_name" et "card_name" sont requis.',
            });
        }
        const trelloService = getTrelloService();
        const card = await trelloService.createTask({
            board: board_name,
            list: list_name,
            title: card_name,
            due_date: typeof due_date === 'string' && due_date.trim().length > 0
                ? due_date
                : undefined,
        });
        return res.status(200).json({
            success: true,
            card,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/createTrelloTask:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la création de la tâche',
        });
    }
});
/**
 * @openapi
 * /assistant/updateTrelloDueDate:
 *   post:
 *     summary: Met à jour la date d’échéance d’une carte.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - card_name
 *               - due_date
 *             properties:
 *               card_name:
 *                 type: string
 *                 description: Nom de la carte à modifier.
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Nouvelle date d'échéance au format ISO 8601.
 *               board_name:
 *                 type: string
 *                 description: Board cible (optionnel).
 *     responses:
 *       200:
 *         description: Échéance mise à jour.
 *       400:
 *         description: Date invalide ou paramètres manquants.
 *       404:
 *         description: Carte non trouvée.
 */
router.post('/updateTrelloDueDate', optionalApiKeyAuth, async (req, res) => {
    try {
        const { board_name, card_name, due_date } = req.body || {};
        if (!card_name || typeof card_name !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "card_name" est requis.',
            });
        }
        if (!due_date || typeof due_date !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "due_date" est requis.',
            });
        }
        if (Number.isNaN(Date.parse(due_date))) {
            return res.status(400).json({
                success: false,
                error: 'Le champ "due_date" doit être une date ISO 8601 valide.',
            });
        }
        const trelloService = getTrelloService();
        const updated = await trelloService.updateDueDate({
            board: typeof board_name === 'string' ? board_name : undefined,
            task_name: card_name,
            due_date,
        });
        return res.status(200).json({
            success: true,
            updated,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/updateTrelloDueDate:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || "Erreur lors de la mise à jour de l'échéance",
        });
    }
});
/**
 * @openapi
 * /assistant/generateBoardSummary:
 *   get:
 *     summary: Génère un résumé exécutif d’un board Trello.
 *     description: Retourne un résumé global du board (listes, cartes, deadlines, santé opérationnelle).
 *     parameters:
 *       - in: query
 *         name: board_name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nom du board Trello ciblé.
 *     responses:
 *       200:
 *         description: Résumé généré.
 *       404:
 *         description: Board non trouvé.
 */
router.get('/generateBoardSummary', optionalApiKeyAuth, async (req, res) => {
    try {
        const boardName = typeof req.query.board_name === 'string'
            ? req.query.board_name
            : undefined;
        if (!boardName) {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "board_name" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.generateBoardSummary(boardName);
        return res.status(200).json({
            success: true,
            board: boardName,
            summary: report,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/generateBoardSummary:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la génération du résumé',
        });
    }
});
/**
 * @openapi
 * /assistant/suggestBoardCleanup:
 *   get:
 *     summary: Suggère des actions de nettoyage pour un board.
 *     description: Fournit une liste de cartes obsolètes, doublons ou sans échéance pour améliorer la clarté du board.
 *     parameters:
 *       - in: query
 *         name: board_name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nom du board Trello à analyser.
 *     responses:
 *       200:
 *         description: Suggestions de nettoyage générées.
 *       404:
 *         description: Board non trouvé.
 */
router.get('/suggestBoardCleanup', optionalApiKeyAuth, async (req, res) => {
    try {
        const boardName = typeof req.query.board_name === 'string'
            ? req.query.board_name
            : undefined;
        if (!boardName) {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "board_name" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const plan = await trelloService.suggestBoardCleanup(boardName);
        return res.status(200).json({
            success: true,
            board: boardName,
            plan,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/suggestBoardCleanup:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la génération du plan de nettoyage',
        });
    }
});
/**
 * @openapi
 * /assistant/generateBoardSummary:
 *   post:
 *     summary: Génère un résumé global des listes et cartes d'un board.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - board_name
 *             properties:
 *               board_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Résumé généré.
 */
router.post('/generateBoardSummary', optionalApiKeyAuth, async (req, res) => {
    try {
        const { board_name } = req.body || {};
        if (typeof board_name !== 'string' || board_name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Le champ "board_name" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.generateBoardSummary(board_name);
        return res.status(200).json({
            success: true,
            board: board_name,
            summary: report,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/generateBoardSummary:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la génération du résumé',
        });
    }
});
/**
 * @openapi
 * /assistant/analyzeBoardHealth:
 *   get:
 *     summary: Analyse la santé d’un board Trello.
 *     description: Analyse les cartes en retard, les listes surchargées et les priorités non assignées.
 *     parameters:
 *       - in: query
 *         name: board_name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nom du board Trello à analyser.
 *     responses:
 *       200:
 *         description: Analyse retournée.
 *       404:
 *         description: Board non trouvé.
 */
router.get('/analyzeBoardHealth', optionalApiKeyAuth, async (req, res) => {
    try {
        const boardName = typeof req.query.board_name === 'string'
            ? req.query.board_name
            : undefined;
        if (!boardName) {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "board_name" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.analyzeBoardHealth(boardName);
        return res.status(200).json({
            success: true,
            board: boardName,
            metrics: report,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/analyzeBoardHealth:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || "Erreur lors de l'analyse du board",
        });
    }
});
/**
 * @openapi
 * /assistant/analyzeBoardHealth:
 *   post:
 *     summary: Analyse la santé générale d'un board Trello.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - board_name
 *             properties:
 *               board_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rapport de santé renvoyé.
 */
router.post('/analyzeBoardHealth', optionalApiKeyAuth, async (req, res) => {
    try {
        const { board_name } = req.body || {};
        if (typeof board_name !== 'string' || board_name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Le champ "board_name" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.analyzeBoardHealth(board_name);
        return res.status(200).json({
            success: true,
            board: board_name,
            metrics: report,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/analyzeBoardHealth:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || "Erreur lors de l'analyse du board",
        });
    }
});
/**
 * GET /assistant/trello/actions/board
 * Récupère les actions d'un board Trello
 */
router.get('/trello/actions/board', optionalApiKeyAuth, async (req, res) => {
    try {
        const boardNameParam = Array.isArray(req.query.boardName)
            ? req.query.boardName[0]
            : req.query.boardName;
        if (!boardNameParam || typeof boardNameParam !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "boardName" est requis.',
            });
        }
        const filterParam = req.query.filter;
        let filterList;
        if (typeof filterParam === 'string' || Array.isArray(filterParam)) {
            const rawValues = Array.isArray(filterParam)
                ? filterParam
                : [filterParam];
            const values = rawValues
                .filter((value) => typeof value === 'string')
                .flatMap((value) => value.split(','))
                .map((value) => value.trim())
                .filter((value) => value.length > 0);
            if (values.length > 0) {
                filterList = values;
            }
        }
        const since = typeof req.query.since === 'string' ? req.query.since : undefined;
        const before = typeof req.query.before === 'string' ? req.query.before : undefined;
        const limitParam = Array.isArray(req.query.limit)
            ? req.query.limit[0]
            : req.query.limit;
        let limit;
        if (typeof limitParam === 'string' && limitParam.trim().length > 0) {
            const parsed = Number(limitParam);
            if (Number.isNaN(parsed)) {
                return res.status(400).json({
                    success: false,
                    error: 'Le paramètre "limit" doit être un nombre.',
                });
            }
            limit = parsed;
        }
        const trelloService = getTrelloService();
        const actions = await trelloService.getBoardActions({
            boardName: boardNameParam,
            filter: filterList,
            since,
            before,
            limit,
        });
        return res.json({
            success: true,
            actions,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/trello/actions/board:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * GET /assistant/trello/actions/card
 * Récupère les actions d'une carte Trello
 */
router.get('/trello/actions/card', optionalApiKeyAuth, async (req, res) => {
    try {
        const cardNameParam = Array.isArray(req.query.cardName)
            ? req.query.cardName[0]
            : req.query.cardName;
        if (!cardNameParam || typeof cardNameParam !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "cardName" est requis.',
            });
        }
        const boardNameParam = Array.isArray(req.query.boardName)
            ? req.query.boardName[0]
            : req.query.boardName;
        const filterParam = req.query.filter;
        let filterList;
        if (typeof filterParam === 'string' || Array.isArray(filterParam)) {
            const rawValues = Array.isArray(filterParam)
                ? filterParam
                : [filterParam];
            const values = rawValues
                .filter((value) => typeof value === 'string')
                .flatMap((value) => value.split(','))
                .map((value) => value.trim())
                .filter((value) => value.length > 0);
            if (values.length > 0) {
                filterList = values;
            }
        }
        const since = typeof req.query.since === 'string' ? req.query.since : undefined;
        const before = typeof req.query.before === 'string' ? req.query.before : undefined;
        const limitParam = Array.isArray(req.query.limit)
            ? req.query.limit[0]
            : req.query.limit;
        let limit;
        if (typeof limitParam === 'string' && limitParam.trim().length > 0) {
            const parsed = Number(limitParam);
            if (Number.isNaN(parsed)) {
                return res.status(400).json({
                    success: false,
                    error: 'Le paramètre "limit" doit être un nombre.',
                });
            }
            limit = parsed;
        }
        const trelloService = getTrelloService();
        const actions = await trelloService.getCardActions({
            cardName: cardNameParam,
            board: typeof boardNameParam === 'string' ? boardNameParam : undefined,
            filter: filterList,
            since,
            before,
            limit,
        });
        return res.json({
            success: true,
            actions,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/trello/actions/card:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/card/description/improve
 * Améliore la description d'une carte Trello
 */
router.post('/trello/card/description/improve', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, instructions } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const result = await trelloService.improveCardDescription({
            cardName,
            instructions: typeof instructions === 'string' ? instructions : undefined,
        });
        return res.json({
            success: true,
            updated: result.updated,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/card/description/improve:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * @openapi
 * /assistant/trello/card/update-field:
 *   post:
 *     summary: Met à jour un champ spécifique d’une carte Trello.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - card_name
 *               - field_name
 *               - new_value
 *             properties:
 *               card_name:
 *                 type: string
 *                 description: Nom exact de la carte à modifier.
 *               field_name:
 *                 type: string
 *                 description: Nom du champ Trello à mettre à jour.
 *               new_value:
 *                 type: string
 *                 description: Nouvelle valeur à appliquer au champ.
 *     responses:
 *       200:
 *         description: Champ mis à jour avec succès.
 *       400:
 *         description: Paramètres invalides ou manquants.
 *       404:
 *         description: Carte non trouvée.
 */
/**
 * POST /assistant/trello/card/update-field
 * Met à jour un champ spécifique d'une carte Trello
 */
router.post('/trello/card/update-field', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, field, value } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!field || typeof field !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "field" est requis.',
            });
        }
        if (typeof value === 'undefined' || value === null) {
            return res.status(400).json({
                success: false,
                error: 'Le champ "value" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const updated = await trelloService.updateCardField({
            cardName,
            field,
            value: String(value),
        });
        return res.json({
            success: true,
            updated,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/card/update-field:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/card/move
 * Déplace une carte vers une autre liste
 */
router.post('/trello/card/move', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, listName } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!listName || typeof listName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "listName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const moved = await trelloService.moveCardToList({
            cardName,
            listName,
        });
        return res.json({
            success: true,
            moved,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/card/move:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * DELETE /assistant/trello/card
 * Supprime définitivement une carte Trello
 */
router.delete('/trello/card', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const deleted = await trelloService.deleteCard({ cardName });
        return res.json({
            success: true,
            deleted,
        });
    }
    catch (error) {
        console.error('Erreur dans DELETE /assistant/trello/card:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/card/archive
 * Archive une carte Trello (closed=true)
 */
router.post('/trello/card/archive', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const archived = await trelloService.archiveCard({ cardName });
        return res.json({
            success: true,
            archived,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/card/archive:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * @openapi
 * /assistant/trello/card/complete:
 *   post:
 *     summary: Marque une carte Trello comme terminée.
 *     description: Coche la carte comme complétée et l’archive si nécessaire.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - card_name
 *             properties:
 *               card_name:
 *                 type: string
 *                 description: Nom de la carte à compléter.
 *               board_name:
 *                 type: string
 *                 description: Board cible (optionnel).
 *     responses:
 *       200:
 *         description: Tâche complétée.
 *       404:
 *         description: Carte non trouvée.
 */
router.post('/trello/card/complete', optionalApiKeyAuth, async (req, res) => {
    try {
        const { card_name, board_name } = req.body || {};
        if (!card_name || typeof card_name !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "card_name" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const result = await trelloService.completeTask({
            board: typeof board_name === 'string' ? board_name : undefined,
            task_name: card_name,
        });
        return res.status(200).json({
            success: true,
            card: result,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/card/complete:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la complétion de la tâche',
        });
    }
});
/**
 * POST /assistant/trello/checklist/create
 * Crée une checklist sur une carte Trello
 */
router.post('/trello/checklist/create', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, checklistName, items } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!checklistName || typeof checklistName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "checklistName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const checklist = await trelloService.createChecklist({
            cardName,
            checklistName,
            items: Array.isArray(items) ? items : undefined,
        });
        return res.json({
            success: true,
            checklist,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/checklist/create:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/checklist/item/add
 * Ajoute un item à une checklist existante
 */
router.post('/trello/checklist/item/add', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, checklistName, itemName } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!checklistName || typeof checklistName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "checklistName" est requis.',
            });
        }
        if (!itemName || typeof itemName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "itemName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const item = await trelloService.addChecklistItem({
            cardName,
            checklistName,
            itemName,
        });
        return res.json({
            success: true,
            item,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/checklist/item/add:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/checklist/item/check
 * Coche un item dans une checklist
 */
router.post('/trello/checklist/item/check', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, checklistName, itemName } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!checklistName || typeof checklistName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "checklistName" est requis.',
            });
        }
        if (!itemName || typeof itemName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "itemName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const item = await trelloService.checkChecklistItem({
            cardName,
            checklistName,
            itemName,
        });
        return res.json({
            success: true,
            item,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/checklist/item/check:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/label/add
 * Ajoute un label existant à une carte
 */
router.post('/trello/label/add', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, labelNameOrColor } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!labelNameOrColor || typeof labelNameOrColor !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "labelNameOrColor" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const label = await trelloService.addLabel({
            cardName,
            labelNameOrColor,
        });
        return res.json({
            success: true,
            label,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/label/add:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/due/shift
 * Décale les échéances des cartes d'une liste
 */
router.post('/trello/due/shift', optionalApiKeyAuth, async (req, res) => {
    try {
        const { listName, days } = req.body || {};
        if (!listName || typeof listName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "listName" est requis.',
            });
        }
        const numericDays = typeof days === 'number'
            ? days
            : typeof days === 'string'
                ? Number(days)
                : NaN;
        if (Number.isNaN(numericDays)) {
            return res.status(400).json({
                success: false,
                error: 'Le champ "days" doit être un nombre.',
            });
        }
        const trelloService = getTrelloService();
        const shifted = await trelloService.shiftDueDates({
            listName,
            days: numericDays,
        });
        return res.json({
            success: true,
            shifted,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/due/shift:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/sort/due
 * Trie les cartes d'une liste par date d'échéance
 */
router.post('/trello/sort/due', optionalApiKeyAuth, async (req, res) => {
    try {
        const { listName, order } = req.body || {};
        if (!listName || typeof listName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "listName" est requis.',
            });
        }
        const normalizedOrder = order === 'desc' || order === 'asc' ? order : 'asc';
        const trelloService = getTrelloService();
        const sorted = await trelloService.sortListByDueDate({
            listName,
            order: normalizedOrder,
        });
        return res.json({
            success: true,
            sorted,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/sort/due:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/sort/prioritize
 * Réorganise une liste selon son score de priorité
 */
router.post('/trello/sort/prioritize', optionalApiKeyAuth, async (req, res) => {
    try {
        const { listName } = req.body || {};
        if (!listName || typeof listName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "listName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const prioritized = await trelloService.prioritizeList({ listName });
        return res.json({
            success: true,
            prioritized,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/sort/prioritize:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/sort/group
 * Regroupe les cartes d'un board selon un critère donné
 */
router.post('/trello/sort/group', optionalApiKeyAuth, async (req, res) => {
    try {
        const { boardName, criteria } = req.body || {};
        if (!boardName || typeof boardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "boardName" est requis.',
            });
        }
        const allowedCriteria = ['label', 'member', 'due'];
        const normalizedCriteria = allowedCriteria.includes(criteria)
            ? criteria
            : null;
        if (!normalizedCriteria) {
            return res.status(400).json({
                success: false,
                error: 'Le champ "criteria" doit être parmi "label", "member" ou "due".',
            });
        }
        const trelloService = getTrelloService();
        const groups = await trelloService.groupCards({
            boardName,
            criteria: normalizedCriteria,
        });
        return res.json({
            success: true,
            groups,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/sort/group:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/audit/board
 * Analyse la santé globale d'un board
 */
router.post('/trello/audit/board', optionalApiKeyAuth, async (req, res) => {
    try {
        const { boardName } = req.body || {};
        if (!boardName || typeof boardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "boardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.analyzeBoardHealth(boardName);
        return res.json({
            success: true,
            report,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/audit/board:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/audit/list
 * Analyse la santé d'une liste spécifique
 */
router.post('/trello/audit/list', optionalApiKeyAuth, async (req, res) => {
    try {
        const { boardName, listName } = req.body || {};
        if (!boardName || typeof boardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "boardName" est requis.',
            });
        }
        if (!listName || typeof listName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "listName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.auditList(boardName, listName);
        return res.json({
            success: true,
            report,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/audit/list:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/audit/history
 * Analyse l'historique d'un board
 */
router.post('/trello/audit/history', optionalApiKeyAuth, async (req, res) => {
    try {
        const { boardName, since, before } = req.body || {};
        if (!boardName || typeof boardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "boardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.auditHistory({
            boardName,
            since: typeof since === 'string' ? since : undefined,
            before: typeof before === 'string' ? before : undefined,
        });
        return res.json({
            success: true,
            report,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/audit/history:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/audit/cleanup
 * Génère un plan de nettoyage sans action
 */
router.post('/trello/audit/cleanup', optionalApiKeyAuth, async (req, res) => {
    try {
        const { boardName } = req.body || {};
        if (!boardName || typeof boardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "boardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const plan = await trelloService.suggestBoardCleanup(boardName);
        return res.json({
            success: true,
            plan,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/audit/cleanup:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/report/board
 * Génère un résumé exécutif complet du board
 */
router.post('/trello/report/board', optionalApiKeyAuth, async (req, res) => {
    try {
        const { boardName } = req.body || {};
        if (!boardName || typeof boardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "boardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const report = await trelloService.generateBoardSummary(boardName);
        return res.json({
            success: true,
            report,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/report/board:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * GET /assistant/trello/due/overdue
 * Retourne les cartes en retard d'un board
 */
router.get('/trello/due/overdue', optionalApiKeyAuth, async (req, res) => {
    try {
        const boardNameParam = Array.isArray(req.query.boardName)
            ? req.query.boardName[0]
            : req.query.boardName;
        if (!boardNameParam || typeof boardNameParam !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "boardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const overdue = await trelloService.listOverdueTasks({
            boardName: boardNameParam,
        });
        return res.json({
            success: true,
            overdue,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/trello/due/overdue:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * GET /assistant/trello/labels
 * Liste les labels d'un board
 */
router.get('/trello/labels', optionalApiKeyAuth, async (req, res) => {
    try {
        const boardNameParam = Array.isArray(req.query.boardName)
            ? req.query.boardName[0]
            : req.query.boardName;
        if (!boardNameParam || typeof boardNameParam !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "boardName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const labels = await trelloService.listBoardLabels({
            boardName: boardNameParam,
        });
        return res.json({
            success: true,
            labels,
        });
    }
    catch (error) {
        console.error('Erreur dans GET /assistant/trello/labels:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
/**
 * POST /assistant/trello/checklist/item/check
 * Coche un item dans une checklist
 */
router.post('/trello/checklist/item/check', optionalApiKeyAuth, async (req, res) => {
    try {
        const { cardName, checklistName, itemName } = req.body || {};
        if (!cardName || typeof cardName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "cardName" est requis.',
            });
        }
        if (!checklistName || typeof checklistName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "checklistName" est requis.',
            });
        }
        if (!itemName || typeof itemName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Le champ "itemName" est requis.',
            });
        }
        const trelloService = getTrelloService();
        const item = await trelloService.checkChecklistItem({
            cardName,
            checklistName,
            itemName,
        });
        return res.json({
            success: true,
            item,
        });
    }
    catch (error) {
        console.error('Erreur dans POST /assistant/trello/checklist/item/check:', error);
        if (error instanceof errors_1.TrelloError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
        });
    }
});
EXPRESS_TOOL_ROUTES.forEach((action) => {
    router.post(`/${action}`, optionalApiKeyAuth, createToolEndpointHandler(action));
});
function createToolEndpointHandler(action) {
    return async (req, res) => {
        try {
            const handler = trello_1.trelloToolHandlers[action];
            if (!handler) {
                return res.status(404).json({
                    success: false,
                    error: `Handler ${action} introuvable`,
                });
            }
            const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
            if (typeof payload.action !== 'string') {
                payload.action = action;
            }
            const result = await handler(payload);
            return res.status(200).json({
                success: true,
                message: result?.message ?? `Action "${action}" exécutée avec succès`,
                data: result?.data ?? null,
            });
        }
        catch (error) {
            console.error(`Erreur dans POST /assistant/${action}:`, error);
            return res.status(500).json({
                success: false,
                error: error?.message || "Erreur lors de l'exécution de l'action",
            });
        }
    };
}
/**
 * Exécute les tool calls et retourne les résultats
 */
async function executeToolCalls(toolCalls) {
    const results = [];
    for (const toolCall of toolCalls) {
        try {
            const functionCall = toolCall.function || toolCall.function_call || {};
            const functionName = typeof functionCall.name === 'string'
                ? functionCall.name.trim()
                : '';
            if (!functionName) {
                throw new Error('Aucun nom de fonction fourni dans le tool_call (champ "function.name").');
            }
            const rawArgs = typeof functionCall.arguments === 'string'
                ? functionCall.arguments
                : JSON.stringify(functionCall.arguments ?? {});
            const args = rawArgs && rawArgs.trim().length > 0 ? JSON.parse(rawArgs) : {};
            const handler = trello_1.trelloToolHandlers[functionName];
            if (!handler) {
                results.push({
                    tool_call_id: toolCall.id,
                    function_name: functionName,
                    success: false,
                    error: `Fonction inconnue: ${functionName}`,
                });
                continue;
            }
            const handlerResult = await handler(args);
            results.push({
                tool_call_id: toolCall.id,
                function_name: functionName,
                success: true,
                message: handlerResult?.message || `Action "${functionName}" exécutée avec succès`,
                data: handlerResult?.data ?? null,
            });
        }
        catch (error) {
            results.push({
                tool_call_id: toolCall.id,
                function_name: typeof toolCall.function?.name === 'string'
                    ? toolCall.function.name
                    : 'unknown',
                success: false,
                error: error?.message || "Erreur lors de l'exécution",
            });
        }
    }
    return results;
}
/**
 * GET /assistant/tools
 * Retourne le contenu exact de tools.json
 */
router.get('/tools', optionalApiKeyAuth, async (_req, res) => {
    try {
        const jsonData = fs_1.default.readFileSync(TOOLS_JSON_PATH, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(jsonData);
    }
    catch (error) {
        console.error('Erreur lors de la lecture de tools.json:', error);
        res.status(500).json({ error: 'tools.json introuvable' });
    }
});
/**
 * GET /dummy
 * Endpoint de santé minimal requis par les validateurs OpenAPI
 */
router.get('/dummy', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Trello Assistant backend is running',
    });
});
exports.default = router;
