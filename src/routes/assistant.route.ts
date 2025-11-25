/**
 * Route principale pour l'assistant Trello
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { TrelloService } from '../services/trello.service';
import { ToolCall } from '../types/openai.types';
import { TrelloError } from '../utils/errors';

const router = Router();
const TOOLS_JSON_PATH = path.join(__dirname, '..', 'tools.json');

// Initialisation lazy du service Trello (après chargement des variables d'environnement)
let trelloServiceInstance: TrelloService | null = null;

function getTrelloService(): TrelloService {
  if (!trelloServiceInstance) {
    trelloServiceInstance = new TrelloService();
  }
  return trelloServiceInstance;
}

/**
 * Middleware optionnel pour vérifier l'API key (si configurée)
 * Permet à ChatGPT de stocker la clé et éviter les demandes d'autorisation répétées
 */
function optionalApiKeyAuth(req: Request, res: Response, next: Function) {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.CHATGPT_API_KEY;
  
  // Si une clé est attendue mais non fournie, on accepte quand même (pour compatibilité)
  // Mais on log pour debug
  if (expectedApiKey && apiKey !== expectedApiKey) {
    console.log('⚠️ API Key manquante ou invalide (requête acceptée pour compatibilité)');
  }
  
  next();
}

/**
 * POST /assistant/trello
 * 
 * Accepte deux formats:
 * 1. { tool_calls: [...] } - Format direct depuis OpenAI (variante A)
 * 2. { message: "..." } - Message utilisateur brut (variante B, nécessite OPENAI_API_KEY)
 */
router.post('/trello', optionalApiKeyAuth, async (req: Request, res: Response) => {
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
      const { OpenAIService } = await import('../services/openai.service');
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
  } catch (error: any) {
    console.error('Erreur dans /assistant/trello:', error);

    if (error instanceof TrelloError) {
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
 * GET /assistant/health
 * Ping minimal pour vérifier l'état du backend via /assistant prefix
 */
router.get('/health', optionalApiKeyAuth, (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Trello Assistant backend is running',
  });
});

/**
 * POST /assistant/createTrelloTask
 * Crée une carte sur un board / liste donnés
 */
router.post(
  '/createTrelloTask',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
    try {
      const { board_name, list_name, card_name, due_date } = req.body || {};

      if (
        typeof board_name !== 'string' ||
        typeof list_name !== 'string' ||
        typeof card_name !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Les champs "board_name", "list_name" et "card_name" sont requis.',
        });
      }

      const trelloService = getTrelloService();
      const card = await trelloService.createTask({
        board: board_name,
        list: list_name,
        title: card_name,
        due_date:
          typeof due_date === 'string' && due_date.trim().length > 0
            ? due_date
            : undefined,
      });

      return res.status(200).json({
        success: true,
        card,
      });
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/createTrelloTask:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/generateBoardSummary
 * Génère un résumé global du board
 */
router.post(
  '/generateBoardSummary',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error(
        'Erreur dans POST /assistant/generateBoardSummary:',
        error
      );

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/analyzeBoardHealth
 * Retourne des métriques simples sur un board
 */
router.post(
  '/analyzeBoardHealth',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error(
        'Erreur dans POST /assistant/analyzeBoardHealth:',
        error
      );

      if (error instanceof TrelloError) {
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
  }
);

/**
 * GET /assistant/trello/actions/board
 * Récupère les actions d'un board Trello
 */
router.get(
  '/trello/actions/board',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
      let filterList: string[] | undefined;
      if (typeof filterParam === 'string' || Array.isArray(filterParam)) {
        const rawValues = Array.isArray(filterParam)
          ? filterParam
          : [filterParam];
        const values = rawValues
          .filter((value): value is string => typeof value === 'string')
          .flatMap((value) => value.split(','))
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        if (values.length > 0) {
          filterList = values;
        }
      }

      const since =
        typeof req.query.since === 'string' ? req.query.since : undefined;
      const before =
        typeof req.query.before === 'string' ? req.query.before : undefined;

      const limitParam = Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;
      let limit: number | undefined;
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
    } catch (error: any) {
      console.error(
        'Erreur dans GET /assistant/trello/actions/board:',
        error
      );

      if (error instanceof TrelloError) {
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
  }
);

/**
 * GET /assistant/trello/actions/card
 * Récupère les actions d'une carte Trello
 */
router.get(
  '/trello/actions/card',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
      let filterList: string[] | undefined;
      if (typeof filterParam === 'string' || Array.isArray(filterParam)) {
        const rawValues = Array.isArray(filterParam)
          ? filterParam
          : [filterParam];
        const values = rawValues
          .filter((value): value is string => typeof value === 'string')
          .flatMap((value) => value.split(','))
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        if (values.length > 0) {
          filterList = values;
        }
      }

      const since =
        typeof req.query.since === 'string' ? req.query.since : undefined;
      const before =
        typeof req.query.before === 'string' ? req.query.before : undefined;

      const limitParam = Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;
      let limit: number | undefined;
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
    } catch (error: any) {
      console.error(
        'Erreur dans GET /assistant/trello/actions/card:',
        error
      );

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/card/description/improve
 * Améliore la description d'une carte Trello
 */
router.post(
  '/trello/card/description/improve',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error(
        'Erreur dans POST /assistant/trello/card/description/improve:',
        error
      );

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/card/update-field
 * Met à jour un champ spécifique d'une carte Trello
 */
router.post(
  '/trello/card/update-field',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/card/update-field:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/card/move
 * Déplace une carte vers une autre liste
 */
router.post(
  '/trello/card/move',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/card/move:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * DELETE /assistant/trello/card
 * Supprime définitivement une carte Trello
 */
router.delete(
  '/trello/card',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans DELETE /assistant/trello/card:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/card/archive
 * Archive une carte Trello (closed=true)
 */
router.post(
  '/trello/card/archive',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/card/archive:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/checklist/create
 * Crée une checklist sur une carte Trello
 */
router.post(
  '/trello/checklist/create',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/checklist/create:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/checklist/item/add
 * Ajoute un item à une checklist existante
 */
router.post(
  '/trello/checklist/item/add',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/checklist/item/add:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/checklist/item/check
 * Coche un item dans une checklist
 */
router.post(
  '/trello/checklist/item/check',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/checklist/item/check:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/label/add
 * Ajoute un label existant à une carte
 */
router.post(
  '/trello/label/add',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/label/add:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/due/shift
 * Décale les échéances des cartes d'une liste
 */
router.post(
  '/trello/due/shift',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
    try {
      const { listName, days } = req.body || {};

      if (!listName || typeof listName !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Le champ "listName" est requis.',
        });
      }

      const numericDays =
        typeof days === 'number'
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/due/shift:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/sort/due
 * Trie les cartes d'une liste par date d'échéance
 */
router.post(
  '/trello/sort/due',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
    try {
      const { listName, order } = req.body || {};

      if (!listName || typeof listName !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Le champ "listName" est requis.',
        });
      }

      const normalizedOrder =
        order === 'desc' || order === 'asc' ? (order as 'asc' | 'desc') : 'asc';

      const trelloService = getTrelloService();
      const sorted = await trelloService.sortListByDueDate({
        listName,
        order: normalizedOrder,
      });

      return res.json({
        success: true,
        sorted,
      });
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/sort/due:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/sort/prioritize
 * Réorganise une liste selon son score de priorité
 */
router.post(
  '/trello/sort/prioritize',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/sort/prioritize:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/sort/group
 * Regroupe les cartes d'un board selon un critère donné
 */
router.post(
  '/trello/sort/group',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
        ? (criteria as 'label' | 'member' | 'due')
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/sort/group:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/audit/board
 * Analyse la santé globale d'un board
 */
router.post(
  '/trello/audit/board',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/audit/board:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/audit/list
 * Analyse la santé d'une liste spécifique
 */
router.post(
  '/trello/audit/list',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/audit/list:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/audit/history
 * Analyse l'historique d'un board
 */
router.post(
  '/trello/audit/history',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/audit/history:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/audit/cleanup
 * Génère un plan de nettoyage sans action
 */
router.post(
  '/trello/audit/cleanup',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/audit/cleanup:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/report/board
 * Génère un résumé exécutif complet du board
 */
router.post(
  '/trello/report/board',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/report/board:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * GET /assistant/trello/due/overdue
 * Retourne les cartes en retard d'un board
 */
router.get(
  '/trello/due/overdue',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans GET /assistant/trello/due/overdue:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * GET /assistant/trello/labels
 * Liste les labels d'un board
 */
router.get(
  '/trello/labels',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans GET /assistant/trello/labels:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * POST /assistant/trello/checklist/item/check
 * Coche un item dans une checklist
 */
router.post(
  '/trello/checklist/item/check',
  optionalApiKeyAuth,
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error('Erreur dans POST /assistant/trello/checklist/item/check:', error);

      if (error instanceof TrelloError) {
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
  }
);

/**
 * Exécute les tool calls et retourne les résultats
 */
async function executeToolCalls(toolCalls: ToolCall[]): Promise<any[]> {
  const results = [];

  for (const toolCall of toolCalls) {
    try {
      const functionCall: any =
        (toolCall as any).function || (toolCall as any).function_call || {};

      const functionName =
        typeof functionCall.name === 'string'
          ? functionCall.name.trim()
          : '';

      if (!functionName) {
        throw new Error(
          'Aucun nom de fonction fourni dans le tool_call (champ "function.name").'
        );
      }

      const rawArgs =
        typeof functionCall.arguments === 'string'
          ? functionCall.arguments
          : JSON.stringify(functionCall.arguments ?? {});

      const args =
        rawArgs && rawArgs.trim().length > 0 ? JSON.parse(rawArgs) : {};

      let result: any;

      const trelloService = getTrelloService();

      switch (functionName) {
        case 'createTrelloTask':
          result = await trelloService.createTask(args);
          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Tâche "${result.name}" créée avec succès`,
            data: result,
          });
          break;

        case 'completeTrelloTask':
          result = await trelloService.completeTask(args);
          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Tâche "${result.name}" marquée comme terminée`,
            data: result,
          });
          break;

        case 'updateTrelloDueDate':
          result = await trelloService.updateDueDate(args);
          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Date d'échéance de "${result.name}" mise à jour`,
            data: result,
          });
          break;

        case 'archiveTrelloTask':
          result = await trelloService.archiveTask(args);
          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Tâche "${result.name}" archivée avec succès`,
            data: result,
          });
          break;

        case 'moveTrelloTask':
          result = await trelloService.moveTask(args);
          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Tâche "${result.name}" déplacée vers "${args.target_list}"`,
            data: result,
          });
          break;

        case 'getBoardActions': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour getBoardActions');
          }

          let filters: string[] | undefined;
          if (Array.isArray(args.filter)) {
            filters = args.filter
              .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value: string) => value.length > 0);
          } else if (typeof args.filter === 'string') {
            filters = args.filter
              .split(',')
              .map((value: string) => value.trim())
              .filter((value: string) => value.length > 0);
          }

          let limit: number | undefined;
          if (typeof args.limit === 'number') {
            limit = args.limit;
          } else if (typeof args.limit === 'string' && args.limit.trim().length > 0) {
            const parsed = Number(args.limit);
            if (Number.isNaN(parsed)) {
              throw new Error('Le paramètre "limit" doit être numérique.');
            }
            limit = parsed;
          }

          const actions = await trelloService.getBoardActions({
            boardName,
            filter: filters,
            since: typeof args.since === 'string' ? args.since : undefined,
            before: typeof args.before === 'string' ? args.before : undefined,
            limit,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Actions récupérées sur "${boardName}" (${actions.length})`,
            data: { actions },
          });
          break;
        }

        case 'getCardActions': {
          const cardName = args.card_name || args.cardName;
          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour getCardActions');
          }

          let filters: string[] | undefined;
          if (Array.isArray(args.filter)) {
            filters = args.filter
              .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value: string) => value.length > 0);
          } else if (typeof args.filter === 'string') {
            filters = args.filter
              .split(',')
              .map((value: string) => value.trim())
              .filter((value: string) => value.length > 0);
          }

          let limit: number | undefined;
          if (typeof args.limit === 'number') {
            limit = args.limit;
          } else if (typeof args.limit === 'string' && args.limit.trim().length > 0) {
            const parsed = Number(args.limit);
            if (Number.isNaN(parsed)) {
              throw new Error('Le paramètre "limit" doit être numérique.');
            }
            limit = parsed;
          }

          const boardName =
            typeof args.board === 'string'
              ? args.board
              : typeof args.board_name === 'string'
              ? args.board_name
              : undefined;

          const actions = await trelloService.getCardActions({
            cardName,
            board: boardName,
            filter: filters,
            since: typeof args.since === 'string' ? args.since : undefined,
            before: typeof args.before === 'string' ? args.before : undefined,
            limit,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Actions récupérées pour la carte "${cardName}" (${actions.length})`,
            data: { actions },
          });
          break;
        }

        case 'improveCardDescription': {
          const cardName = args.card_name || args.cardName;
          if (!cardName || typeof cardName !== 'string') {
            throw new Error(
              'Le paramètre "card_name" est requis pour improveCardDescription'
            );
          }

          const instructions =
            typeof args.instructions === 'string' ? args.instructions : undefined;

          const result = await trelloService.improveCardDescription({
            cardName,
            instructions,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Description améliorée pour "${cardName}"`,
            data: result,
          });
          break;
        }

        case 'updateCardField': {
          const cardName = args.card_name || args.cardName;
          const field = args.field;
          const value = args.value;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour updateCardField');
          }
          if (!field || typeof field !== 'string') {
            throw new Error('Le paramètre "field" est requis pour updateCardField');
          }
          if (typeof value === 'undefined') {
            throw new Error('Le paramètre "value" est requis pour updateCardField');
          }

          const update = await trelloService.updateCardField({
            cardName,
            field,
            value: String(value),
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Champ "${field}" mis à jour sur "${cardName}"`,
            data: update,
          });
          break;
        }

        case 'moveCardToList': {
          const cardName = args.card_name || args.cardName;
          const listName = args.list_name || args.listName;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour moveCardToList');
          }
          if (!listName || typeof listName !== 'string') {
            throw new Error('Le paramètre "list_name" est requis pour moveCardToList');
          }

          const moved = await trelloService.moveCardToList({
            cardName,
            listName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Carte déplacée : "${cardName}" → liste "${listName}"`,
            data: moved,
          });
          break;
        }

        case 'deleteCard': {
          const cardName = args.card_name || args.cardName;
          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour deleteCard');
          }

          const deleted = await trelloService.deleteCard({ cardName });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Carte supprimée : "${cardName}"`,
            data: deleted,
          });
          break;
        }

        case 'archiveCard': {
          const cardName = args.card_name || args.cardName;
          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour archiveCard');
          }

          const archived = await trelloService.archiveCard({ cardName });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Carte archivée : "${cardName}"`,
            data: archived,
          });
          break;
        }

        case 'createChecklist': {
          const cardName = args.card_name || args.cardName;
          const checklistName = args.checklist_name || args.checklistName;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour createChecklist');
          }
          if (!checklistName || typeof checklistName !== 'string') {
            throw new Error('Le paramètre "checklist_name" est requis pour createChecklist');
          }

          const items = Array.isArray(args.items)
            ? args.items
                .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
                .filter((value: string) => value.length > 0)
            : [];

          const checklist = await trelloService.createChecklist({
            cardName,
            checklistName,
            items,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Checklist "${checklistName}" créée sur la carte "${cardName}"`,
            data: checklist,
          });
          break;
        }

        case 'addChecklistItem': {
          const cardName = args.card_name || args.cardName;
          const checklistName = args.checklist_name || args.checklistName;
          const itemName = args.item_name || args.itemName;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour addChecklistItem');
          }
          if (!checklistName || typeof checklistName !== 'string') {
            throw new Error('Le paramètre "checklist_name" est requis pour addChecklistItem');
          }
          if (!itemName || typeof itemName !== 'string') {
            throw new Error('Le paramètre "item_name" est requis pour addChecklistItem');
          }

          const item = await trelloService.addChecklistItem({
            cardName,
            checklistName,
            itemName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Item "${itemName}" ajouté dans la checklist "${checklistName}"`,
            data: item,
          });
          break;
        }

        case 'checkChecklistItem': {
          const cardName = args.card_name || args.cardName;
          const checklistName = args.checklist_name || args.checklistName;
          const itemName = args.item_name || args.itemName;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour checkChecklistItem');
          }
          if (!checklistName || typeof checklistName !== 'string') {
            throw new Error('Le paramètre "checklist_name" est requis pour checkChecklistItem');
          }
          if (!itemName || typeof itemName !== 'string') {
            throw new Error('Le paramètre "item_name" est requis pour checkChecklistItem');
          }

          const item = await trelloService.checkChecklistItem({
            cardName,
            checklistName,
            itemName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Item "${itemName}" coché dans la checklist "${checklistName}"`,
            data: item,
          });
          break;
        }

        case 'checkChecklistItem': {
          const cardName = args.card_name || args.cardName;
          const checklistName = args.checklist_name || args.checklistName;
          const itemName = args.item_name || args.itemName;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour checkChecklistItem');
          }
          if (!checklistName || typeof checklistName !== 'string') {
            throw new Error('Le paramètre "checklist_name" est requis pour checkChecklistItem');
          }
          if (!itemName || typeof itemName !== 'string') {
            throw new Error('Le paramètre "item_name" est requis pour checkChecklistItem');
          }

          const checkedItem = await trelloService.checkChecklistItem({
            cardName,
            checklistName,
            itemName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Item "${itemName}" coché dans la checklist "${checklistName}"`,
            data: checkedItem,
          });
          break;
        }

        case 'addLabel': {
          const cardName = args.card_name || args.cardName;
          const labelNameOrColor =
            args.label_name_or_color || args.labelNameOrColor;

          if (!cardName || typeof cardName !== 'string') {
            throw new Error('Le paramètre "card_name" est requis pour addLabel');
          }
          if (!labelNameOrColor || typeof labelNameOrColor !== 'string') {
            throw new Error(
              'Le paramètre "label_name_or_color" est requis pour addLabel'
            );
          }

          const label = await trelloService.addLabel({
            cardName,
            labelNameOrColor,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Label "${labelNameOrColor}" ajouté à la carte "${cardName}"`,
            data: label,
          });
          break;
        }

        case 'listBoardLabels': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour listBoardLabels');
          }

          const labels = await trelloService.listBoardLabels({
            boardName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Labels récupérés pour le board "${boardName}" (${labels.length})`,
            data: { labels },
          });
          break;
        }

        case 'listOverdueTasks': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error(
              'Le paramètre "board_name" est requis pour listOverdueTasks'
            );
          }

          const overdue = await trelloService.listOverdueTasks({
            boardName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Tâches en retard récupérées pour le board "${boardName}" (${overdue.length})`,
            data: { overdue },
          });
          break;
        }

        case 'sortListByDueDate': {
          const listName = args.list_name || args.listName;
          const order =
            args.order === 'desc' || args.order === 'asc' ? args.order : 'asc';

          if (!listName || typeof listName !== 'string') {
            throw new Error('Le paramètre "list_name" est requis pour sortListByDueDate');
          }

          const sorted = await trelloService.sortListByDueDate({
            listName,
            order,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Liste "${listName}" triée par date (${order}).`,
            data: { sorted },
          });
          break;
        }

        case 'prioritizeList': {
          const listName = args.list_name || args.listName;
          if (!listName || typeof listName !== 'string') {
            throw new Error('Le paramètre "list_name" est requis pour prioritizeList');
          }

          const prioritized = await trelloService.prioritizeList({
            listName,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Liste "${listName}" réorganisée selon la priorité.`,
            data: { prioritized },
          });
          break;
        }

        case 'groupCards': {
          const boardName = args.board_name || args.boardName;
          const criteria = args.criteria;

          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour groupCards');
          }

          const allowedCriteria = ['label', 'member', 'due'];
          if (!allowedCriteria.includes(criteria)) {
            throw new Error('Le paramètre "criteria" doit être "label", "member" ou "due"');
          }

          const groups = await trelloService.groupCards({
            boardName,
            criteria,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Cartes groupées selon le critère "${criteria}"`,
            data: groups,
          });
          break;
        }

        case 'getBoardSnapshot': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour getBoardSnapshot');
          }

          const snapshot = await trelloService.getBoardSnapshot(boardName);

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Snapshot récupéré pour le board "${boardName}"`,
            data: snapshot,
          });
          break;
        }

        case 'analyzeBoardHealth': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour analyzeBoardHealth');
          }

          const report = await trelloService.analyzeBoardHealth(boardName);

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Audit réalisé sur le board "${boardName}"`,
            data: report,
          });
          break;
        }

        case 'auditHistory': {
          const boardName = args.board_name || args.boardName;
          const since = args.since;
          const before = args.before;

          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour auditHistory');
          }

          const report = await trelloService.auditHistory({
            boardName,
            since: typeof since === 'string' ? since : undefined,
            before: typeof before === 'string' ? before : undefined,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Audit d'historique réalisé pour le board "${boardName}"`,
            data: report,
          });
          break;
        }

        case 'auditList': {
          const boardName = args.board_name || args.boardName;
          const listName = args.list_name || args.listName;

          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour auditList');
          }
          if (!listName || typeof listName !== 'string') {
            throw new Error('Le paramètre "list_name" est requis pour auditList');
          }

          const report = await trelloService.auditList(boardName, listName);

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Audit réalisé sur la liste "${listName}" du board "${boardName}"`,
            data: report,
          });
          break;
        }
        case 'generateBoardSummary': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour generateBoardSummary');
          }

          const trelloService = getTrelloService();
          const report = await trelloService.generateBoardSummary(boardName);

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Résumé exécutif généré pour le board "${boardName}"`,
            data: report,
          });
          break;
        }
        case 'suggestBoardCleanup': {
          const boardName = args.board_name || args.boardName;
          if (!boardName || typeof boardName !== 'string') {
            throw new Error('Le paramètre "board_name" est requis pour suggestBoardCleanup');
          }

          const plan = await trelloService.suggestBoardCleanup(boardName);

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Plan de nettoyage généré pour le board "${boardName}"`,
            data: plan,
          });
          break;
        }

        case 'shiftDueDates': {
          const listName = args.list_name || args.listName;
          const rawDays = args.days;

          if (!listName || typeof listName !== 'string') {
            throw new Error('Le paramètre "list_name" est requis pour shiftDueDates');
          }

          const numericDays =
            typeof rawDays === 'number'
              ? rawDays
              : typeof rawDays === 'string'
              ? Number(rawDays)
              : NaN;

          if (Number.isNaN(numericDays)) {
            throw new Error('Le paramètre "days" doit être un nombre pour shiftDueDates');
          }

          const shifted = await trelloService.shiftDueDates({
            listName,
            days: numericDays,
          });

          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: true,
            message: `Décalage de ${numericDays} jours appliqué à la liste "${listName}"`,
            data: { shifted },
          });
          break;
        }

        default:
          results.push({
            tool_call_id: toolCall.id,
            function_name: functionName,
            success: false,
            error: `Fonction inconnue: ${functionName}`,
          });
      }
    } catch (error: any) {
      results.push({
        tool_call_id: toolCall.id,
        function_name: toolCall.function.name,
        success: false,
        error: error.message || 'Erreur lors de l\'exécution',
      });
    }
  }

  return results;
}

/**
 * GET /assistant/tools
 * Retourne le contenu exact de tools.json
 */
router.get('/tools', optionalApiKeyAuth, async (_req: Request, res: Response) => {
  try {
    const jsonData = fs.readFileSync(TOOLS_JSON_PATH, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(jsonData);
  } catch (error: any) {
    console.error('Erreur lors de la lecture de tools.json:', error);
    res.status(500).json({ error: 'tools.json introuvable' });
  }
});

/**
 * GET /dummy
 * Endpoint de santé minimal requis par les validateurs OpenAPI
 */
router.get('/dummy', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Trello Assistant backend is running',
  });
});

export default router;

