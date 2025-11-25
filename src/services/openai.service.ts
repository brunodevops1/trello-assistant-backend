/**
 * Service pour interagir avec OpenAI et définir les tools
 */

import OpenAI from 'openai';
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
  {
    type: 'function',
    function: {
      name: 'getBoardActions',
      description:
        'Récupère les dernières actions d’un board Trello pour analyser l’historique (création, mise à jour, déplacement, commentaires, etc.).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description:
              "Nom du board Trello (ex: 'Organisation', 'Prazo Espagne').",
          },
          filter: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              "Liste des types d’actions Trello à filtrer (ex: 'createCard', 'updateCard', 'commentCard', 'moveCardToBoard'). Si non précisé, toutes les actions sont retournées.",
          },
          since: {
            type: 'string',
            description:
              "Date/heure de début en ISO 8601 (ex: '2025-11-01T00:00:00Z').",
          },
          before: {
            type: 'string',
            description: 'Date/heure de fin en ISO 8601.',
          },
          limit: {
            type: 'number',
            description:
              'Nombre maximum d’actions à récupérer (ex: 50).',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCardActions',
      description:
        "Récupère l'historique des actions sur une carte Trello (créations, mises à jour, déplacements, commentaires, etc.).",
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte Trello (ex: 'Budget Q1').",
          },
          filter: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              "Liste des types d’actions à filtrer (ex: 'createCard', 'updateCard', 'commentCard').",
          },
          since: {
            type: 'string',
            description:
              "Date/heure de début en ISO 8601 (ex: '2025-11-01T00:00:00Z').",
          },
          before: {
            type: 'string',
            description: 'Date/heure de fin en ISO 8601.',
          },
          limit: {
            type: 'number',
            description: 'Nombre maximum d’actions à récupérer (ex: 50).',
          },
        },
        required: ['card_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'improveCardDescription',
      description:
        'Améliore la description d’une carte Trello en la rendant plus claire, structurée et professionnelle.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte Trello dont la description doit être améliorée.",
          },
          instructions: {
            type: 'string',
            description:
              'Consignes additionnelles (ton, structure, points à aborder). Optionnel.',
          },
        },
        required: ['card_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateCardField',
      description:
        'Met à jour un champ spécifique d’une carte Trello (nom, description, échéance, position, etc.).',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte à modifier.",
          },
          field: {
            type: 'string',
            description: 'Nom du champ Trello à mettre à jour (ex: name, desc, due, pos).',
          },
          value: {
            type: 'string',
            description: 'Nouvelle valeur à appliquer au champ.',
          },
        },
        required: ['card_name', 'field', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'moveCardToList',
      description: 'Déplace une carte Trello vers une autre liste.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte à déplacer.",
          },
          list_name: {
            type: 'string',
            description: "Nom de la liste destination (ex: 'En cours', 'Done').",
          },
        },
        required: ['card_name', 'list_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteCard',
      description: 'Supprime définitivement une carte Trello.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte à supprimer.",
          },
        },
        required: ['card_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archiveCard',
      description:
        "Archive une carte Trello en la plaçant dans l'état 'closed=true'.",
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte à archiver.",
          },
        },
        required: ['card_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createChecklist',
      description:
        'Crée une checklist sur une carte Trello, avec des items optionnels.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte sur laquelle créer la checklist.",
          },
          checklist_name: {
            type: 'string',
            description: "Nom de la checklist (ex: 'Préparation lancement').",
          },
          items: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Liste d’items à ajouter à la checklist (optionnel).',
          },
        },
        required: ['card_name', 'checklist_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addChecklistItem',
      description:
        'Ajoute un item dans une checklist existante d’une carte Trello.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte contenant la checklist.",
          },
          checklist_name: {
            type: 'string',
            description: "Nom de la checklist cible.",
          },
          item_name: {
            type: 'string',
            description: 'Nom de l’item à ajouter.',
          },
        },
        required: ['card_name', 'checklist_name', 'item_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkChecklistItem',
      description:
        'Coche un item dans une checklist existante d’une carte Trello.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte contenant la checklist.",
          },
          checklist_name: {
            type: 'string',
            description: "Nom de la checklist cible.",
          },
          item_name: {
            type: 'string',
            description: 'Nom de l’item à cocher.',
          },
        },
        required: ['card_name', 'checklist_name', 'item_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addLabel',
      description:
        'Ajoute un label existant (par nom ou couleur) sur une carte Trello.',
      parameters: {
        type: 'object',
        properties: {
          card_name: {
            type: 'string',
            description: "Nom exact de la carte à étiqueter.",
          },
          label_name_or_color: {
            type: 'string',
            description:
              'Nom du label ou couleur (ex: "Urgent", "red"). Les labels doivent déjà exister sur le board.',
          },
        },
        required: ['card_name', 'label_name_or_color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'shiftDueDates',
      description:
        'Décale les échéances de toutes les cartes d’une liste Trello (offset positif ou négatif en jours).',
      parameters: {
        type: 'object',
        properties: {
          list_name: {
            type: 'string',
            description: 'Nom de la liste dont les cartes doivent être décalées.',
          },
          days: {
            type: 'number',
            description:
              'Nombre de jours à ajouter (positif) ou retirer (négatif) aux échéances existantes.',
          },
        },
        required: ['list_name', 'days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listBoardLabels',
      description: 'Retourne tous les labels d’un board Trello (nom, couleur, id).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom ou ID du board Trello.',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listOverdueTasks',
      description: 'Liste toutes les cartes en retard sur un board Trello.',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom ou ID du board à analyser.',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sortListByDueDate',
      description: 'Trie les cartes d’une liste Trello en fonction de leurs échéances.',
      parameters: {
        type: 'object',
        properties: {
          list_name: {
            type: 'string',
            description: 'Nom de la liste à trier.',
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Ordre de tri: asc (par défaut) ou desc.',
          },
        },
        required: ['list_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prioritizeList',
      description:
        'Réorganise une liste Trello selon un score d’urgence (échéances, labels critiques, etc.).',
      parameters: {
        type: 'object',
        properties: {
          list_name: {
            type: 'string',
            description: 'Nom de la liste à prioriser.',
          },
        },
        required: ['list_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'groupCards',
      description:
        'Regroupe les cartes d’un board Trello selon un critère choisi (label, membre, échéance).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom ou ID du board Trello.',
          },
          criteria: {
            type: 'string',
            enum: ['label', 'member', 'due'],
            description: 'Critère utilisé pour regrouper les cartes.',
          },
        },
        required: ['board_name', 'criteria'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getBoardSnapshot',
      description:
        'Retourne un snapshot complet du board (listes, cartes, labels, membres, checklists, stats).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom du board Trello.',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyzeBoardHealth',
      description:
        'Analyse un board Trello et identifie les problèmes (retards, absence de labels, tâches stagnantes, etc.).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom du board Trello.',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'auditList',
      description:
        'Analyse une liste spécifique d’un board Trello et détecte les problèmes (retards, absence de labels, tâches stagnantes...).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom du board Trello.',
          },
          list_name: {
            type: 'string',
            description: 'Nom de la liste à auditer.',
          },
        },
        required: ['board_name', 'list_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'auditHistory',
      description:
        "Analyse l'historique d'un board Trello (actions, pics, inactivité) et détecte les anomalies.",
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom du board à analyser.',
          },
          since: {
            type: 'string',
            description: 'Début de période ISO 8601 (optionnel).',
          },
          before: {
            type: 'string',
            description: 'Fin de période ISO 8601 (optionnel).',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generateBoardSummary',
      description:
        'Génère un résumé exécutif complet d’un board Trello (audit avancé, risques, recommandations).',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom du board à résumer.',
          },
        },
        required: ['board_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggestBoardCleanup',
      description:
        'Analyse un board pour générer un plan de nettoyage (archiver les cartes anciennes, ajouter des échéances, labels, checklists, rééquilibrer) sans rien modifier.',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: 'string',
            description: 'Nom du board à analyser.',
          },
        },
        required: ['board_name'],
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
10. Quand l'utilisateur demande un historique d'activité sur un board, utilise getBoardActions.
11. Quand l'utilisateur demande l'historique d'une carte précise, utilise getCardActions.
12. Quand l'utilisateur veut améliorer ou reformuler une description, utilise improveCardDescription.
13. Quand l'utilisateur veut modifier un champ précis (titre, description, due date, position, etc.), utilise updateCardField.
14. Quand l'utilisateur demande de déplacer une carte vers une autre liste, utilise moveCardToList.
15. Quand l'utilisateur demande de supprimer une carte, utilise deleteCard.
16. Quand l'utilisateur demande d'archiver une carte (la fermer sans la supprimer), utilise archiveCard.
17. Quand l'utilisateur demande de créer une checklist sur une carte, utilise createChecklist.
18. Quand l'utilisateur demande d'ajouter un item dans une checklist existante, utilise addChecklistItem.
19. Quand l'utilisateur demande de cocher un item dans une checklist existante, utilise checkChecklistItem.
20. Quand l'utilisateur veut appliquer un label existant, utilise addLabel.
21. Quand l'utilisateur veut connaître tous les labels disponibles sur un board, utilise listBoardLabels.
22. Quand l'utilisateur veut décaler en masse les échéances d'une liste, utilise shiftDueDates.
23. Quand l'utilisateur veut connaître toutes les tâches en retard d'un board, utilise listOverdueTasks.
24. Quand l'utilisateur veut trier une liste selon les échéances, utilise sortListByDueDate.
25. Quand l'utilisateur veut réorganiser une liste selon une logique d'urgence, utilise prioritizeList.
26. Quand l'utilisateur veut regrouper les cartes d'un board selon un critère, utilise groupCards.
27. Quand l'utilisateur veut obtenir un snapshot complet d'un board, utilise getBoardSnapshot.
28. Quand l'utilisateur demande un audit/santé d'un board, utilise analyzeBoardHealth.
29. Quand l'utilisateur veut auditer une liste précise, utilise auditList.
30. Quand l'utilisateur veut un résumé exécutif complet combinant les audits, utilise generateBoardSummary.

EXEMPLES:
- "Ajoute une tâche Préparer le budget 2026 dans À faire pour vendredi" → createTrelloTask(title="Préparer le budget 2026", list="À faire", due_date="2026-XX-XX")
- "Marque Médiation SNCF comme terminée" → completeTrelloTask(task_name="Médiation SNCF")
- "Change la date de Renouvellement RTE au 31 janvier" → updateTrelloDueDate(task_name="Renouvellement RTE", due_date="2026-01-31T00:00:00Z")
- "Archive la tâche Test" → archiveTrelloTask(task_name="Test")
- "Déplace la tâche Budget vers En cours" → moveTrelloTask(task_name="Budget", target_list="En cours")
- "Donne-moi les 20 dernières actions sur le board Organisation depuis lundi" → getBoardActions(board_name="Organisation", since="2026-XX-XX", limit=20, filter=[...])
- "Montre-moi ce qui s'est passé sur la carte Médiation SNCF" → getCardActions(card_name="Médiation SNCF")
- "Rends la description de la carte Budget Q1 plus professionnelle" → improveCardDescription(card_name="Budget Q1")
- "Change le titre de la carte Médiation SNCF en Médiation SNCF - Urgent" → updateCardField(card_name="Médiation SNCF", field="name", value="Médiation SNCF - Urgent")
- "Déplace la carte Budget Q1 vers la liste En cours" → moveCardToList(card_name="Budget Q1", list_name="En cours")
- "Supprime définitivement la carte Démo" → deleteCard(card_name="Démo")
- "Archive la carte Budget Q1" → archiveCard(card_name="Budget Q1")
- "Ajoute une checklist Préparation avec les items [Budget, Design] sur la carte Lancement" → createChecklist(card_name="Lancement", checklist_name="Préparation", items=["Budget", "Design"])
- "Ajoute un item Validation budget dans la checklist Préparation sur la carte Lancement" → addChecklistItem(card_name="Lancement", checklist_name="Préparation", item_name="Validation budget")
- "Coche l'item Validation budget dans la checklist Préparation sur la carte Lancement" → checkChecklistItem(card_name="Lancement", checklist_name="Préparation", item_name="Validation budget")
- "Ajoute le label Urgent sur la carte Installation CHU" → addLabel(card_name="Installation CHU", label_name_or_color="Urgent")
- "Quels labels existent sur le board Organisation ?" → listBoardLabels(board_name="Organisation")
- "Décale toutes les échéances de la liste À faire de 3 jours" → shiftDueDates(list_name="À faire", days=3)
- "Quelles cartes sont en retard sur le board Organisation ?" → listOverdueTasks(board_name="Organisation")
- "Trie la liste À faire par date d'échéance (ordre croissant)" → sortListByDueDate(list_name="À faire", order="asc")
- "Réorganise la liste Interventions selon l'urgence" → prioritizeList(list_name="Interventions")
- "Groupe toutes les cartes d'Organisation par label" → groupCards(board_name="Organisation", criteria="label")
- "Donne-moi un snapshot complet du board Organisation" → getBoardSnapshot(board_name="Organisation")
- "Fais un audit santé du board Marketing" → analyzeBoardHealth(board_name="Marketing")
- "Analyse la liste À faire du board Organisation" → auditList(board_name="Organisation", list_name="À faire")`;

/**
 * Service pour gérer les appels OpenAI (variante B: parsing côté backend)
 */
export class OpenAIService {
  private client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn(
        'OPENAI_API_KEY non définie. Le parsing côté backend ne sera pas disponible.'
      );
      this.client = null;
      return;
    }

    this.client = new OpenAI({ apiKey });
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error('OPENAI_API_KEY non configurée');
    }
    return this.client;
  }

  /**
   * Parse un message utilisateur et retourne les tool calls
   * (Utilisé si on veut que le backend fasse le parsing)
   */
  async parseUserMessage(message: string): Promise<any> {
    const client = this.ensureClient();

    const response = await client.chat.completions.create({
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
      tools: TRELLO_TOOLS as any,
      tool_choice: 'auto',
    });

    return response;
  }

  /**
   * Appel générique au modèle OpenAI pour obtenir un texte structuré
   */
  async callModel(
    prompt: string,
    options?: { systemPrompt?: string; temperature?: number }
  ): Promise<string> {
    const client = this.ensureClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature:
        typeof options?.temperature === 'number' ? options.temperature : 0.2,
      messages: [
        {
          role: 'system',
          content:
            options?.systemPrompt ||
            'Tu es un consultant Trello senior qui fournit des analyses structurées et actionnables.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generated = response.choices?.[0]?.message?.content?.trim();
    if (!generated) {
      throw new Error("Réponse vide de l'API OpenAI");
    }

    return generated;
  }

  /**
   * Génère un texte amélioré à partir d'un prompt
   */
  async generateText(prompt: string): Promise<string> {
    return this.callModel(prompt, {
      systemPrompt:
        'Tu es un assistant spécialisé dans la rédaction claire et professionnelle pour Trello.',
      temperature: 0.2,
    });
  }
}

export default OpenAIService;

