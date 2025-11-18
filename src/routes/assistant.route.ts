/**
 * Route principale pour l'assistant Trello
 */

import { Router, Request, Response } from 'express';
import { TrelloService } from '../services/trello.service';
import { ToolCall } from '../types/openai.types';
import { TrelloError } from '../utils/errors';

const router = Router();

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
 * Exécute les tool calls et retourne les résultats
 */
async function executeToolCalls(toolCalls: ToolCall[]): Promise<any[]> {
  const results = [];

  for (const toolCall of toolCalls) {
    try {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

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
 * Retourne la définition des tools OpenAI
 */
router.get('/tools', (_req: Request, res: Response) => {
  const { TRELLO_TOOLS, SYSTEM_PROMPT } = require('../services/openai.service');
  res.json({
    tools: TRELLO_TOOLS,
    system_prompt: SYSTEM_PROMPT,
  });
});

export default router;

