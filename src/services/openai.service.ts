/**
 * Service pour interagir avec OpenAI et définir les tools
 */

import { ToolDefinition } from '../types/openai.types';

/**
 * Définition des tools OpenAI pour l'assistant Trello
 */
export const TRELLO_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'createTrelloTask',
      description:
        'Crée une nouvelle tâche (carte) dans Trello. Utilise cette fonction quand l\'utilisateur demande d\'ajouter, créer ou insérer une tâche.',
      parameters: {
        type: 'object',
        properties: {
          board: {
            type: 'string',
            description:
              'Le nom ou l\'ID du board Trello. Optionnel, utilise le board par défaut si non spécifié.',
          },
          list: {
            type: 'string',
            description:
              'Le nom de la liste dans laquelle créer la tâche. Par défaut: "À faire".',
          },
          title: {
            type: 'string',
            description: 'Le titre de la tâche à créer. Obligatoire.',
          },
          due_date: {
            type: 'string',
            description:
              'La date d\'échéance au format ISO 8601 (ex: "2026-01-31T00:00:00Z"). Optionnel.',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'completeTrelloTask',
      description:
        'Marque une tâche existante comme terminée dans Trello. Utilise cette fonction quand l\'utilisateur demande de marquer, terminer, compléter ou fermer une tâche.',
      parameters: {
        type: 'object',
        properties: {
          board: {
            type: 'string',
            description:
              'Le nom ou l\'ID du board Trello. Optionnel, utilise le board par défaut si non spécifié.',
          },
          task_name: {
            type: 'string',
            description:
              'Le nom exact de la tâche à marquer comme terminée. Obligatoire.',
          },
        },
        required: ['task_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateTrelloDueDate',
      description:
        'Met à jour la date d\'échéance d\'une tâche existante dans Trello. Utilise cette fonction quand l\'utilisateur demande de changer, modifier ou déplacer la date d\'une tâche.',
      parameters: {
        type: 'object',
        properties: {
          board: {
            type: 'string',
            description:
              'Le nom ou l\'ID du board Trello. Optionnel, utilise le board par défaut si non spécifié.',
          },
          task_name: {
            type: 'string',
            description:
              'Le nom exact de la tâche dont la date doit être modifiée. Obligatoire.',
          },
          due_date: {
            type: 'string',
            description:
              'La nouvelle date d\'échéance au format ISO 8601 (ex: "2026-01-31T00:00:00Z"). Obligatoire.',
          },
        },
        required: ['task_name', 'due_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archiveTrelloTask',
      description:
        'Archive une tâche existante dans Trello (la ferme sans la supprimer). Utilise cette fonction quand l\'utilisateur demande d\'archiver, fermer ou supprimer visuellement une tâche.',
      parameters: {
        type: 'object',
        properties: {
          board: {
            type: 'string',
            description:
              'Le nom ou l\'ID du board Trello. Optionnel, utilise le board par défaut si non spécifié.',
          },
          task_name: {
            type: 'string',
            description:
              'Le nom exact de la tâche à archiver. Obligatoire.',
          },
        },
        required: ['task_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'moveTrelloTask',
      description:
        'Déplace une tâche existante d\'une liste à une autre dans Trello. Utilise cette fonction quand l\'utilisateur demande de déplacer, transférer ou changer la liste d\'une tâche.',
      parameters: {
        type: 'object',
        properties: {
          board: {
            type: 'string',
            description:
              'Le nom ou l\'ID du board Trello. Optionnel, utilise le board par défaut si non spécifié.',
          },
          task_name: {
            type: 'string',
            description:
              'Le nom exact de la tâche à déplacer. Obligatoire.',
          },
          target_list: {
            type: 'string',
            description:
              'Le nom de la liste de destination où déplacer la tâche. Obligatoire.',
          },
        },
        required: ['task_name', 'target_list'],
      },
    },
  },
];

/**
 * Prompt système pour l'assistant Trello
 */
export const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans la gestion de tâches Trello.

RÔLE:
- Tu aides les utilisateurs à gérer leurs tâches Trello via des commandes en langage naturel.
- Tu dois TOUJOURS utiliser les outils (function calling) disponibles pour exécuter les actions Trello.
- Ne réponds JAMAIS en texte libre quand une action Trello est possible - utilise toujours un tool_call.

RÈGLES IMPORTANTES:
1. Quand l'utilisateur demande de créer une tâche, utilise createTrelloTask.
2. Quand l'utilisateur demande de marquer une tâche comme terminée, utilise completeTrelloTask.
3. Quand l'utilisateur demande de modifier une date d'échéance, utilise updateTrelloDueDate.
4. Quand l'utilisateur demande d'archiver, fermer ou supprimer visuellement une tâche, utilise archiveTrelloTask.
5. Quand l'utilisateur demande de déplacer, transférer ou changer la liste d'une tâche, utilise moveTrelloTask.
6. Extrais les informations pertinentes du message utilisateur (titre, date, board, liste).
7. Pour les dates, convertis-les au format ISO 8601 (ex: "vendredi" -> date du prochain vendredi, "31 janvier" -> "2026-01-31T00:00:00Z").
8. Si le board ou la liste ne sont pas mentionnés, utilise les valeurs par défaut.
9. Après chaque action, confirme brièvement ce qui a été fait.

EXEMPLES:
- "Ajoute une tâche Préparer le budget 2026 dans À faire pour vendredi" → createTrelloTask(title="Préparer le budget 2026", list="À faire", due_date="2026-XX-XX")
- "Marque Médiation SNCF comme terminée" → completeTrelloTask(task_name="Médiation SNCF")
- "Change la date de Renouvellement RTE au 31 janvier" → updateTrelloDueDate(task_name="Renouvellement RTE", due_date="2026-01-31T00:00:00Z")
- "Archive la tâche Test" → archiveTrelloTask(task_name="Test")
- "Déplace la tâche Budget vers En cours" → moveTrelloTask(task_name="Budget", target_list="En cours")`;

/**
 * Service pour gérer les appels OpenAI (variante B: parsing côté backend)
 */
export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn(
        'OPENAI_API_KEY non définie. Le parsing côté backend ne sera pas disponible.'
      );
    }
  }

  /**
   * Parse un message utilisateur et retourne les tool calls
   * (Utilisé si on veut que le backend fasse le parsing)
   */
  async parseUserMessage(message: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    const { default: axios } = await import('axios');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        tools: TRELLO_TOOLS,
        tool_choice: 'auto',
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}

