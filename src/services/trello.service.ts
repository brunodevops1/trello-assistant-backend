/**
 * Service pour interagir avec l'API Trello
 */

import axios, { AxiosInstance } from 'axios';
import {
  TrelloCard,
  TrelloList,
  TrelloBoard,
  TrelloLabel,
  CreateTaskParams,
  CompleteTaskParams,
  UpdateDueDateParams,
  ArchiveTaskParams,
  MoveTaskParams,
  GetBoardActionsOptions,
  TrelloAction,
  GetCardActionsOptions,
  ImproveCardDescriptionOptions,
  UpdateCardFieldOptions,
  MoveCardToListOptions,
  DeleteCardOptions,
  ArchiveCardOptions,
  CreateChecklistOptions,
  AddChecklistItemOptions,
  CheckChecklistItemOptions,
  AddLabelOptions,
  ListBoardLabelsOptions,
  ShiftDueDatesOptions,
  ShiftedDueDate,
  ListOverdueTasksOptions,
  OverdueTask,
  SortListByDueDateOptions,
  SortedCardPosition,
  PrioritizeListOptions,
  PrioritizedCard,
  GroupCardsOptions,
  GroupCardsResult,
  GroupResult,
  GroupCriteria,
  SnapshotList,
  SnapshotCard,
  BoardSnapshot,
  BoardProblem,
  BoardRecommendation,
  BoardHealthReport,
  ListAuditReport,
  BoardCleanupPlan,
  CleanupSuggestion,
  HistoryAuditReport,
  HistoryAnomaly,
  BoardSummaryReport,
} from '../types/trello.types';
import {
  TrelloError,
  TaskNotFoundError,
  MultipleTasksFoundError,
  BoardNotFoundError,
  ListNotFoundError,
  LabelNotFoundError,
} from '../utils/errors';

export class TrelloService {
  private client: AxiosInstance;
  private apiKey: string;
  private apiToken: string;
  private defaultBoardId: string;

  constructor() {
    this.apiKey = process.env.TRELLO_API_KEY || '';
    this.apiToken = process.env.TRELLO_API_TOKEN || '';
    this.defaultBoardId = process.env.TRELLO_DEFAULT_BOARD_ID || '';

    if (!this.apiKey || !this.apiToken) {
      throw new Error('TRELLO_API_KEY et TRELLO_API_TOKEN doivent être définis');
    }

    this.client = axios.create({
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
  private async getBoard(boardNameOrId?: string): Promise<TrelloBoard> {
    const boardId = boardNameOrId || this.defaultBoardId;

    if (!boardId) {
      throw new Error('Aucun board spécifié et aucun board par défaut configuré');
    }

    try {
      // Si c'est déjà un ID (format: 24 caractères alphanumériques)
      if (/^[a-f0-9]{24}$/i.test(boardId)) {
        const response = await this.client.get<TrelloBoard>(`/boards/${boardId}`);
        return response.data;
      }

      // Sinon, chercher par nom
      const response = await this.client.get<TrelloBoard[]>('/members/me/boards', {
        params: {
          filter: 'open',
        },
      });

      const board = response.data.find((b) => b.name === boardId);
      if (!board) {
        throw new BoardNotFoundError(boardId);
      }

      return board;
    } catch (error: any) {
      if (error instanceof BoardNotFoundError) {
        throw error;
      }
      if (error.response?.status === 404) {
        throw new BoardNotFoundError(boardId);
      }
      throw new TrelloError(
        `Erreur lors de la récupération du board: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Récupère une liste par son nom sur un board
   */
  private async getList(boardId: string, listName: string): Promise<TrelloList> {
    try {
      const response = await this.client.get<TrelloList[]>(`/boards/${boardId}/lists`, {
        params: {
          filter: 'open',
        },
      });

      const list = response.data.find((l) => l.name === listName);
      if (!list) {
        throw new ListNotFoundError(listName);
      }

      return list;
    } catch (error: any) {
      if (error instanceof ListNotFoundError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la récupération de la liste: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Recherche une carte par son nom sur un board
   */
  private async findCardByName(
    boardId: string,
    taskName: string
  ): Promise<TrelloCard> {
    try {
      // Utiliser l'API de recherche Trello
      const response = await this.client.get<{
        cards: TrelloCard[];
      }>('/search', {
        params: {
          query: taskName,
          modelTypes: 'cards',
          idBoards: boardId,
          card_fields: 'id,name,desc,due,dueComplete,idList,idBoard,labels',
        },
      });

      const cards = response.data.cards.filter(
        (card) => card.name.toLowerCase() === taskName.toLowerCase()
      );

      if (cards.length === 0) {
        throw new TaskNotFoundError(taskName);
      }

      if (cards.length > 1) {
        throw new MultipleTasksFoundError(taskName, cards.length);
      }

      return cards[0];
    } catch (error: any) {
      if (error instanceof TaskNotFoundError || error instanceof MultipleTasksFoundError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la recherche de la carte: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Crée une nouvelle tâche (carte) dans Trello
   */
  async createTask(params: CreateTaskParams): Promise<TrelloCard> {
    try {
      const board = await this.getBoard(params.board);
      const listName = params.list || 'Nouvelles taches';
      const list = await this.getList(board.id, listName);

      const cardData: any = {
        name: params.title,
        idList: list.id,
      };

      if (params.due_date) {
        cardData.due = params.due_date;
      }

      const response = await this.client.post<TrelloCard>('/cards', cardData);
      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la création de la tâche: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Marque une tâche comme terminée
   * Stratégie: déplace la carte vers une liste "Terminé" et marque la due date comme complète
   */
  async completeTask(params: CompleteTaskParams): Promise<TrelloCard> {
    try {
      const board = await this.getBoard(params.board);
      const card = await this.findCardByName(board.id, params.task_name);

      // Chercher la liste "Terminé" (variations possibles)
      const listNames = ['Terminé', 'Termine', 'Done', 'Fait', 'Completed'];
      let doneList: TrelloList | null = null;

      for (const listName of listNames) {
        try {
          doneList = await this.getList(board.id, listName);
          break;
        } catch {
          // Continuer à chercher
        }
      }

      // Si pas de liste "Terminé", créer la carte comme complète sans déplacer
      const updates: any = {
        dueComplete: true,
      };

      if (doneList) {
        updates.idList = doneList.id;
      }

      const response = await this.client.put<TrelloCard>(
        `/cards/${card.id}`,
        updates
      );

      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la complétion de la tâche: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Met à jour la date d'échéance d'une tâche
   */
  async updateDueDate(params: UpdateDueDateParams): Promise<TrelloCard> {
    try {
      const board = await this.getBoard(params.board);
      const card = await this.findCardByName(board.id, params.task_name);

      const response = await this.client.put<TrelloCard>(`/cards/${card.id}`, {
        due: params.due_date,
      });

      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la mise à jour de la date: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Archive une tâche (la ferme sans la supprimer)
   */
  async archiveTask(params: ArchiveTaskParams): Promise<TrelloCard> {
    try {
      const board = await this.getBoard(params.board);
      const card = await this.findCardByName(board.id, params.task_name);

      const response = await this.client.put<TrelloCard>(`/cards/${card.id}`, {
        closed: true,
      });

      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de l'archivage de la tâche: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Déplace une tâche d'une liste à une autre
   */
  async moveTask(params: MoveTaskParams): Promise<TrelloCard> {
    try {
      const board = await this.getBoard(params.board);
      const card = await this.findCardByName(board.id, params.task_name);
      const targetList = await this.getList(board.id, params.target_list);

      const response = await this.client.put<TrelloCard>(`/cards/${card.id}`, {
        idList: targetList.id,
      });

      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors du déplacement de la tâche: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Récupère les actions d'un board
   */
  async getBoardActions(options: GetBoardActionsOptions): Promise<TrelloAction[]> {
    const { boardName, filter, since, before, limit } = options;

    if (!boardName) {
      throw new TrelloError('Le nom du board est requis pour récupérer les actions');
    }

    try {
      const board = await this.getBoard(boardName);
      const params: Record<string, string | number> = {};

      const sanitizedFilters =
        filter
          ?.map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)) || [];
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

      const response = await this.client.get<TrelloAction[]>(
        `/boards/${board.id}/actions`,
        {
          params,
        }
      );

      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la récupération des actions du board: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Récupère les actions d'une carte
   */
  async getCardActions(options: GetCardActionsOptions): Promise<TrelloAction[]> {
    const { cardName, board, filter, since, before, limit } = options;

    if (!cardName) {
      throw new TrelloError('Le nom de la carte est requis pour récupérer ses actions');
    }

    try {
      const boardData = await this.getBoard(board);
      const card = await this.findCardByName(boardData.id, cardName);
      const params: Record<string, string | number> = {};

      const sanitizedFilters =
        filter
          ?.map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)) || [];
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

      const response = await this.client.get<TrelloAction[]>(
        `/cards/${card.id}/actions`,
        {
          params,
        }
      );

      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la récupération des actions de la carte: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Améliore la description d'une carte en utilisant OpenAI
   */
  async improveCardDescription(
    options: ImproveCardDescriptionOptions
  ): Promise<{ updated: string }> {
    const { cardName, instructions } = options;

    if (!cardName) {
      throw new TrelloError('Le nom de la carte est requis pour améliorer la description');
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      const cardResponse = await this.client.get<TrelloCard>(`/cards/${card.id}`, {
        params: {
          fields: 'desc',
        },
      });
      const currentDescription = cardResponse.data.desc || '';

      const openaiModule = await import('./openai.service');
      const OpenAIService =
        openaiModule.OpenAIService || (openaiModule as any).default;
      if (!OpenAIService) {
        throw new TrelloError(
          "Le service OpenAI n'est pas disponible pour améliorer la description."
        );
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
        throw new TrelloError('La description générée est vide.');
      }

      await this.client.put<TrelloCard>(`/cards/${card.id}`, {
        desc: improvedDescription,
      });

      return { updated: improvedDescription };
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de l'amélioration de la description: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Met à jour un champ arbitraire d'une carte Trello
   */
  async updateCardField(
    options: UpdateCardFieldOptions
  ): Promise<{ cardName: string; field: string; value: string }> {
    const { cardName, field, value } = options;

    if (!cardName || !field || typeof value === 'undefined') {
      throw new TrelloError(
        'Les champs "cardName", "field" et "value" sont requis pour updateCardField'
      );
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      await this.client.put<TrelloCard>(`/cards/${card.id}`, {
        [field]: value,
      });

      return {
        cardName,
        field,
        value,
      };
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la mise à jour du champ "${field}": ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Déplace une carte dans une autre liste
   */
  async moveCardToList(
    options: MoveCardToListOptions
  ): Promise<{ cardName: string; oldList: string; newList: string }> {
    const { cardName, listName } = options;

    if (!cardName || !listName) {
      throw new TrelloError('Les champs "cardName" et "listName" sont requis.');
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      const cardResponse = await this.client.get<TrelloCard>(`/cards/${card.id}`, {
        params: {
          fields: 'idList,idBoard,name',
        },
      });

      const oldListResponse = await this.client.get<TrelloList>(
        `/lists/${cardResponse.data.idList}`
      );

      const targetList = await this.getList(cardResponse.data.idBoard, listName);

      await this.client.put<TrelloCard>(`/cards/${card.id}`, {
        idList: targetList.id,
      });

      return {
        cardName: cardResponse.data.name,
        oldList: oldListResponse.data.name,
        newList: targetList.name,
      };
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors du déplacement de la carte: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Supprime définitivement une carte Trello
   */
  async deleteCard(
    options: DeleteCardOptions
  ): Promise<{ cardName: string; deleted: boolean }> {
    const { cardName } = options;

    if (!cardName) {
      throw new TrelloError('Le champ "cardName" est requis pour supprimer une carte.');
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      await this.client.delete(`/cards/${card.id}`);

      return {
        cardName,
        deleted: true,
      };
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la suppression de la carte: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Archive une carte Trello (closed = true)
   */
  async archiveCard(
    options: ArchiveCardOptions
  ): Promise<{ cardName: string; archived: boolean }> {
    const { cardName } = options;

    if (!cardName) {
      throw new TrelloError('Le champ "cardName" est requis pour archiver une carte.');
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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de l'archivage de la carte: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Crée une checklist sur une carte Trello
   */
  async createChecklist(
    options: CreateChecklistOptions
  ): Promise<{
    cardName: string;
    checklistName: string;
    checklistId: string;
    items: string[];
  }> {
    const { cardName, checklistName, items = [] } = options;

    if (!cardName || !checklistName) {
      throw new TrelloError('Les champs "cardName" et "checklistName" sont requis.');
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      const checklistResponse = await this.client.post<{
        id: string;
        name: string;
      }>(`/cards/${card.id}/checklists`, {
        name: checklistName,
      });

      const checklistId = checklistResponse.data.id;
      const createdItems: string[] = [];

      for (const item of items) {
        const trimmed = typeof item === 'string' ? item.trim() : '';
        if (!trimmed) continue;

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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la création de la checklist: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Ajoute un item dans une checklist existante
   */
  async addChecklistItem(
    options: AddChecklistItemOptions
  ): Promise<{
    cardName: string;
    checklistName: string;
    itemName: string;
    checklistId: string;
    itemId: string;
  }> {
    const { cardName, checklistName, itemName } = options;

    if (!cardName || !checklistName || !itemName) {
      throw new TrelloError(
        'Les champs "cardName", "checklistName" et "itemName" sont requis.'
      );
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      const checklistsResponse = await this.client.get<
        { id: string; name: string }[]
      >(`/cards/${card.id}/checklists`);

      const checklist = checklistsResponse.data.find(
        (list) => list.name.toLowerCase() === checklistName.toLowerCase()
      );

      if (!checklist) {
        throw new ListNotFoundError(checklistName, cardName);
      }

      const itemResponse = await this.client.post<{
        id: string;
        name: string;
      }>(`/checklists/${checklist.id}/checkItems`, {
        name: itemName,
      });

      return {
        cardName,
        checklistName,
        itemName,
        checklistId: checklist.id,
        itemId: itemResponse.data.id,
      };
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de l'ajout de l'item dans la checklist: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Coche un item dans une checklist
   */
  async checkChecklistItem(
    options: CheckChecklistItemOptions
  ): Promise<{
    cardName: string;
    checklistName: string;
    itemName: string;
    checklistId: string;
    itemId: string;
    state: string;
  }> {
    const { cardName, checklistName, itemName } = options;

    if (!cardName || !checklistName || !itemName) {
      throw new TrelloError(
        'Les champs "cardName", "checklistName" et "itemName" sont requis.'
      );
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      const checklistsResponse = await this.client.get<
        {
          id: string;
          name: string;
          checkItems: { id: string; name: string }[];
        }[]
      >(`/cards/${card.id}/checklists`);

      const checklist = checklistsResponse.data.find(
        (list) => list.name.toLowerCase() === checklistName.toLowerCase()
      );

      if (!checklist) {
        throw new ListNotFoundError(checklistName, cardName);
      }

      const item = checklist.checkItems.find(
        (checkItem) => checkItem.name.toLowerCase() === itemName.toLowerCase()
      );

      if (!item) {
        throw new TaskNotFoundError(itemName, checklistName);
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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors du passage de l'item à l'état complété: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Ajoute un label existant à une carte Trello
   */
  async addLabel(
    options: AddLabelOptions
  ): Promise<{
    cardName: string;
    labelId: string;
    labelName: string | null;
    labelColor: string | null;
    attached: boolean;
  }> {
    const { cardName, labelNameOrColor } = options;

    if (!cardName || !labelNameOrColor) {
      throw new TrelloError(
        'Les champs "cardName" et "labelNameOrColor" sont requis.'
      );
    }

    try {
      const board = await this.getBoard();
      const card = await this.findCardByName(board.id, cardName);

      const labelsResponse = await this.client.get<
        { id: string; name: string | null; color: string | null }[]
      >(`/boards/${card.idBoard}/labels`);

      const normalized = labelNameOrColor.toLowerCase();
      const label =
        labelsResponse.data.find(
          (candidate) => candidate.name?.toLowerCase() === normalized
        ) ||
        labelsResponse.data.find(
          (candidate) => candidate.color?.toLowerCase() === normalized
        );

      if (!label) {
        throw new LabelNotFoundError(labelNameOrColor, board.name);
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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de l'ajout du label: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Liste les labels d'un board
   */
  async listBoardLabels(options: ListBoardLabelsOptions): Promise<TrelloLabel[]> {
    const { boardName } = options;

    if (!boardName) {
      throw new TrelloError('Le champ "boardName" est requis pour lister les labels.');
    }

    try {
      const board = await this.getBoard(boardName);
      const response = await this.client.get<TrelloLabel[]>(
        `/boards/${board.id}/labels`
      );
      return response.data;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la récupération des labels: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Décale les dates d'échéance de toutes les cartes d'une liste
   */
  async shiftDueDates(
    options: ShiftDueDatesOptions
  ): Promise<ShiftedDueDate[]> {
    const { listName, days } = options;

    if (!listName || typeof days !== 'number' || Number.isNaN(days)) {
      throw new TrelloError(
        'Les champs "listName" et "days" (nombre) sont requis pour décaler les échéances.'
      );
    }

    try {
      const board = await this.getBoard();
      const list = await this.getList(board.id, listName);

      const cardsResponse = await this.client.get<
        { id: string; name: string; due: string | null }[]
      >(`/lists/${list.id}/cards`, {
        params: {
          fields: 'name,due',
        },
      });

      const offsetMs = days * 24 * 60 * 60 * 1000;
      const shifted: ShiftedDueDate[] = [];

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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }

      throw new TrelloError(
        `Erreur lors du décalage des échéances: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Liste toutes les tâches en retard sur un board
   */
  async listOverdueTasks(
    options: ListOverdueTasksOptions
  ): Promise<OverdueTask[]> {
    const { boardName } = options;

    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour lister les retards.');
    }

    try {
      const board = await this.getBoard(boardName);
      const listsResponse = await this.client.get<TrelloList[]>(
        `/boards/${board.id}/lists`,
        {
          params: {
            filter: 'open',
          },
        }
      );

      const now = Date.now();
      const overdueTasks: OverdueTask[] = [];

      for (const list of listsResponse.data) {
        const cardsResponse = await this.client.get<
          { id: string; name: string; due: string | null; dueComplete?: boolean }[]
        >(`/lists/${list.id}/cards`, {
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

          const overdueByDays = Math.floor(
            (now - dueDate.getTime()) / (24 * 60 * 60 * 1000)
          );

          overdueTasks.push({
            cardName: card.name,
            listName: list.name,
            due: card.due,
            overdueByDays,
          });
        }
      }

      return overdueTasks;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la récupération des tâches en retard: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Trie les cartes d'une liste selon leur due date
   */
  async sortListByDueDate(
    options: SortListByDueDateOptions
  ): Promise<SortedCardPosition[]> {
    const { listName, order } = options;

    if (!listName || typeof listName !== 'string') {
      throw new TrelloError('Le champ "listName" est requis pour trier une liste.');
    }

    const normalizedOrder = order === 'desc' ? 'desc' : 'asc';

    try {
      const board = await this.getBoard();
      const list = await this.getList(board.id, listName);

      const cardsResponse = await this.client.get<
        { id: string; name: string; due: string | null }[]
      >(`/lists/${list.id}/cards`, {
        params: {
          fields: 'name,due',
        },
      });

      const cardsWithDue = cardsResponse.data
        .filter((card) => !!card.due)
        .map((card) => ({
          ...card,
          dueDate: new Date(card.due as string),
        }))
        .filter((card) => !Number.isNaN(card.dueDate.getTime()));

      cardsWithDue.sort((a, b) => {
        if (normalizedOrder === 'asc') {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return b.dueDate.getTime() - a.dueDate.getTime();
      });

      const sorted: SortedCardPosition[] = [];

      for (let index = 0; index < cardsWithDue.length; index++) {
        const card = cardsWithDue[index];
        const newPos = index + 1;

        await this.client.put(`/cards/${card.id}`, {
          pos: newPos,
        });

        sorted.push({
          cardName: card.name,
          due: card.due as string,
          newPos,
        });
      }

      return sorted;
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors du tri des cartes: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Réorganise une liste selon un score intelligent de priorité
   */
  async prioritizeList(
    options: PrioritizeListOptions
  ): Promise<PrioritizedCard[]> {
    const { listName } = options;

    if (!listName || typeof listName !== 'string') {
      throw new TrelloError('Le champ "listName" est requis pour prioriser une liste.');
    }

    try {
      const board = await this.getBoard();
      const list = await this.getList(board.id, listName);

      const cardsResponse = await this.client.get<
        {
          id: string;
          name: string;
          due: string | null;
          dueComplete?: boolean;
          labels: { name: string | null; color: string | null }[];
        }[]
      >(`/lists/${list.id}/cards`, {
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
          return (
            (name && highPriorityLabels.includes(name)) ||
            (color && highPriorityColors.includes(color))
          );
        });

        if (hasHighPriorityLabel) {
          score += 50;
        }

        if (
          dueDate &&
          !Number.isNaN(dueDate.getTime()) &&
          dueDate.getTime() >= now &&
          dueDate.getTime() - now <= 48 * 60 * 60 * 1000
        ) {
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

      const prioritized: PrioritizedCard[] = [];

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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la priorisation de la liste: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Regroupe les cartes d'un board selon un critère et les déplace dans les listes correspondantes
   */
  async groupCards(options: GroupCardsOptions): Promise<GroupCardsResult> {
    const { boardName, criteria } = options;

    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour grouper les cartes.');
    }

    if (!['label', 'member', 'due'].includes(criteria)) {
      throw new TrelloError('Le critère fourni est invalide.');
    }

    try {
      const board = await this.getBoard(boardName);

      const listsResponse = await this.client.get<TrelloList[]>(
        `/boards/${board.id}/lists`,
        {
          params: { filter: 'open' },
        }
      );

      const allLists = listsResponse.data;
      const listMap = new Map(allLists.map((list) => [list.id, list]));

      const cardsByGroup: Record<
        string,
        {
          card: {
            id: string;
            name: string;
            due: string | null;
            idList: string;
            labels: { name: string | null; color: string | null }[];
            idMembers: string[];
          };
          listBefore: string;
        }[]
      > = {};

      const memberNameCache = new Map<string, string>();

      for (const list of allLists) {
        const cardsResponse = await this.client.get<
          {
            id: string;
            name: string;
            due: string | null;
            idList: string;
            labels: { name: string | null; color: string | null }[];
            idMembers: string[];
          }[]
        >(`/lists/${list.id}/cards`, {
          params: {
            fields: 'name,due,idList,labels,idMembers',
          },
        });

        for (const card of cardsResponse.data) {
          const listBefore = list.name;
          let groupNames: string[] = [];

          if (criteria === 'label') {
            if (!card.labels || card.labels.length === 0) {
              groupNames = ['No Label'];
            } else {
              groupNames = card.labels.map((label) => {
                if (label.name && label.name.trim().length > 0) {
                  return label.name;
                }
                return label.color ? label.color : 'No Label';
              });
            }
          } else if (criteria === 'member') {
            if (!card.idMembers || card.idMembers.length === 0) {
              groupNames = ['Unassigned'];
            } else {
              groupNames = card.idMembers;
            }
          } else if (criteria === 'due') {
            if (!card.due) {
              groupNames = ['No Due Date'];
            } else {
              const dueDate = new Date(card.due);
              if (Number.isNaN(dueDate.getTime())) {
                groupNames = ['No Due Date'];
              } else {
                const now = new Date();
                const diffMs = dueDate.getTime() - now.getTime();
                const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

                if (dueDate.getTime() < now.getTime()) {
                  groupNames = ['Overdue'];
                } else if (dueDate.toDateString() === now.toDateString()) {
                  groupNames = ['Today'];
                } else if (diffDays <= 7) {
                  groupNames = ['This Week'];
                } else {
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

      const groupLists = new Map<string, TrelloList>();

      for (const list of allLists) {
        groupLists.set(list.name, list);
      }

      const ensureListForGroup = async (groupName: string): Promise<TrelloList> => {
        if (groupLists.has(groupName)) {
          return groupLists.get(groupName)!;
        }

        const response = await this.client.post<TrelloList>('/lists', {
          name: groupName,
          idBoard: board.id,
        });
        groupLists.set(groupName, response.data);
        return response.data;
      };

      const groups: GroupResult[] = [];

      for (const [groupName, entries] of Object.entries(cardsByGroup)) {
        const targetList = await ensureListForGroup(groupName);

        const cardsInfo: GroupResult['cards'] = [];

        for (const entry of entries) {
          await this.client.put(`/cards/${entry.card.id}`, {
            idList: targetList.id,
          });

          let displayName = groupName;
          if (criteria === 'member' && groupName !== 'Unassigned') {
            if (!memberNameCache.has(groupName)) {
              const memberResponse = await this.client.get<{ fullName: string }>(
                `/members/${groupName}`,
                {
                  params: {
                    fields: 'fullName',
                  },
                }
              );
              memberNameCache.set(groupName, memberResponse.data.fullName);
            }
            displayName = memberNameCache.get(groupName)!;
          }

          cardsInfo.push({
            cardName: entry.card.name,
            listBefore: entry.listBefore,
            listAfter: displayName,
          });
        }

        groups.push({
          groupName:
            criteria === 'member' && groupName !== 'Unassigned'
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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors du regroupement des cartes: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Récupère un snapshot complet d'un board Trello
   */
  async getBoardSnapshot(boardName: string): Promise<BoardSnapshot> {
    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour le snapshot.');
    }

    try {
      const board = await this.getBoard(boardName);

      const listsResponse = await this.client.get<TrelloList[]>(
        `/boards/${board.id}/lists`,
        { params: { filter: 'open' } }
      );

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

      const snapshotLists: SnapshotList[] = [];

      for (const list of listsResponse.data) {
        const cardsResponse = await this.client.get<
          {
            id: string;
            name: string;
            desc?: string;
            due?: string | null;
            dueComplete?: boolean;
            labels: any[];
            members: any[];
            checklists: {
              id: string;
              name: string;
              checkItems: { id: string; name: string; state: string }[];
            }[];
          }[]
        >(`/lists/${list.id}/cards`, {
          params: {
            fields: 'name,desc,due,dueComplete,labels,idMembers',
            members: true,
            member_fields: 'fullName,username',
            checklists: 'all',
          },
        });

        const snapshotCards: SnapshotCard[] = cardsResponse.data.map((card) => {
          stats.totalCards += 1;

          if (!card.due) {
            stats.noDue += 1;
          } else {
            const dueDate = new Date(card.due);
            if (!Number.isNaN(dueDate.getTime())) {
              if (!card.dueComplete && dueDate.getTime() < now.getTime()) {
                stats.overdue += 1;
              }

              if (dueDate.toDateString() === now.toDateString()) {
                stats.dueToday += 1;
              } else if (
                dueDate.getTime() > now.getTime() &&
                dueDate.getTime() <= weekAhead.getTime()
              ) {
                stats.dueThisWeek += 1;
              }
            } else {
              stats.noDue += 1;
            }
          }

          if (!card.members || card.members.length === 0) {
            stats.unassigned += 1;
          }

          const formattedChecklists =
            card.checklists?.map((checklist) => ({
              id: checklist.id,
              name: checklist.name,
              items:
                checklist.checkItems?.map((item) => ({
                  id: item.id,
                  name: item.name,
                  state: item.state,
                })) || [],
            })) || [];

          if (formattedChecklists.length > 0) {
            stats.withChecklists += 1;
            formattedChecklists.forEach((checklist) => {
              if (
                checklist.items.length > 0 &&
                checklist.items.every((item) => item.state === 'complete')
              ) {
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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la récupération du snapshot: ${error.message}`,
        error.response?.status
      );
    }
  }

  /**
   * Analyse la santé d'un board Trello en s'appuyant sur le snapshot
   */
  async analyzeBoardHealth(boardName: string): Promise<BoardHealthReport> {
    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour l’audit.');
    }

    const snapshot = await this.getBoardSnapshot(boardName);
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const stalledThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const problems: BoardProblem[] = [];
    const recommendations: BoardRecommendation[] = [];
    const recommendationSet = new Set<string>();

    const addProblem = (
      type: BoardProblem['type'],
      card: SnapshotCard,
      listName: string,
      details?: any
    ) => {
      problems.push({
        type,
        cardId: card.id,
        cardName: card.name,
        listName,
        details,
      });
    };

    const addRecommendation = (
      action: BoardRecommendation['action'],
      card: SnapshotCard,
      listName: string,
      suggestedValue?: any
    ) => {
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

    let actionsMap = new Map<string, Date>();
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
    } catch (error) {
      console.warn('Impossible de récupérer les actions récentes pour l’audit.', error);
    }

    for (const list of snapshot.lists) {
      for (const card of list.cards) {
        const dueDate = card.due ? new Date(card.due) : null;

        if (dueDate && !Number.isNaN(dueDate.getTime())) {
          if (!card.dueComplete && dueDate.getTime() < now.getTime()) {
            addProblem('overdue', card, list.name);
            addRecommendation('shiftDueDates', card, list.name, { days: 3 });
          } else if (
            dueDate.getTime() >= now.getTime() &&
            dueDate.getTime() <= soonThreshold.getTime()
          ) {
            addProblem('due_soon', card, list.name, { due: card.due });
          }
        } else {
          addProblem('no_due_date', card, list.name);
          addRecommendation('addChecklistItem', card, list.name, {
            itemName: "Définir une date d'échéance",
          });
        }

        if (!card.members || card.members.length === 0) {
          addProblem('unassigned', card, list.name);
          addRecommendation('applyLabel', card, list.name, { label: 'À assigner' });
        }

        if (
          card.checklists &&
          card.checklists.length > 0 &&
          card.checklists.every((checklist) => !checklist.items || checklist.items.length === 0)
        ) {
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
        } else if (card.labels.length > 5) {
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
    let health: BoardHealthReport['health'] = 'good';
    if (problemCount > 10) {
      health = 'bad';
    } else if (problemCount >= 4) {
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
  async auditList(
    boardName: string,
    listName: string
  ): Promise<ListAuditReport> {
    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour auditer une liste.');
    }
    if (!listName || typeof listName !== 'string') {
      throw new TrelloError('Le champ "listName" est requis pour auditer une liste.');
    }

    const snapshot = await this.getBoardSnapshot(boardName);

    const targetList = snapshot.lists.find(
      (list) => list.name.toLowerCase() === listName.toLowerCase()
    );

    if (!targetList) {
      throw new ListNotFoundError(listName, boardName);
    }

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const stalledThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const problems: BoardProblem[] = [];
    const recommendations: BoardRecommendation[] = [];
    const recommendationSet = new Set<string>();

    const addProblem = (
      type: BoardProblem['type'],
      card: SnapshotCard,
      details?: any
    ) => {
      problems.push({
        type,
        cardId: card.id,
        cardName: card.name,
        listName: targetList.name,
        details,
      });
    };

    const addRecommendation = (
      action: BoardRecommendation['action'],
      card: SnapshotCard,
      suggestedValue?: any
    ) => {
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

    let actionsMap = new Map<string, Date>();
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
    } catch (error) {
      console.warn('Impossible de récupérer les actions récentes pour auditList.', error);
    }

    for (const card of targetList.cards) {
      const dueDate = card.due ? new Date(card.due) : null;

      if (dueDate && !Number.isNaN(dueDate.getTime())) {
        if (!card.dueComplete && dueDate.getTime() < now.getTime()) {
          addProblem('overdue', card);
          addRecommendation('shiftDueDates', card, { days: 3 });
        } else if (
          dueDate.getTime() >= now.getTime() &&
          dueDate.getTime() <= soonThreshold.getTime()
        ) {
          addProblem('due_soon', card, { due: card.due });
        }
      } else {
        addProblem('no_due_date', card);
        addRecommendation('addChecklistItem', card, {
          itemName: "Définir une date d'échéance",
        });
      }

      if (!card.members || card.members.length === 0) {
        addProblem('unassigned', card);
        addRecommendation('applyLabel', card, { label: 'À assigner' });
      }

      if (
        card.checklists &&
        card.checklists.length > 0 &&
        card.checklists.every((checklist) => !checklist.items || checklist.items.length === 0)
      ) {
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
      } else if (card.labels.length > 5) {
        addProblem('too_many_labels', card, { labelsCount: card.labels.length });
      }

      if (card.desc && card.desc.length > 2000) {
        addProblem('long_description', card, { length: card.desc.length });
      }
    }

    const problemCount = problems.length;
    let health: ListAuditReport['health'] = 'good';
    if (problemCount > 5) {
      health = 'bad';
    } else if (problemCount >= 2) {
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
  async auditHistory(options: {
    boardName: string;
    since?: string;
    before?: string;
  }): Promise<HistoryAuditReport> {
    const { boardName, since, before } = options;
    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour auditHistory.');
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

      const anomalies: HistoryAnomaly[] = [];
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const fortyEightHoursMs = 48 * 60 * 60 * 1000;
      const twentyOneDaysMs = 21 * 24 * 60 * 60 * 1000;

      const cardContext = new Map<
        string,
        { name: string; listName: string }
      >();
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

      const cardLastAction = new Map<string, number>();
      const cardFirstAction = new Map<string, number>();
      const memberLastAction = new Map<string, number>();
      const moveTimestamps = new Map<string, number[]>();
      const dayActivity = new Map<string, number>();

      for (const { action, timestamp } of sortedActions) {
        const cardId =
          action.data?.card?.id ||
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

        const memberId =
          action.memberCreator?.id ||
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

        if (
          cardId &&
          action.type === 'updateCard' &&
          action.data?.listAfter &&
          action.data?.listBefore
        ) {
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
      const boardMembers = new Map<string, string>();
      snapshot.lists.forEach((list) => {
        list.cards.forEach((card) => {
          if (Array.isArray(card.members)) {
            card.members.forEach((member: any) => {
              const identifier =
                member?.id || member?.idMember || member?.username;
              const displayName =
                member?.fullName || member?.username || identifier;
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
              message: `Pic d'activité détecté le ${day} (${count} actions, moyenne ${averagePerDay.toFixed(
                1
              )}).`,
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
      const frequentMoveCards = new Set<string>();
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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de l'audit de l'historique: ${error.message}`,
        error.response?.status
      );
    }
  }

  async suggestBoardCleanup(boardName: string): Promise<BoardCleanupPlan> {
    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour le nettoyage.');
    }

    const snapshot = await this.getBoardSnapshot(boardName);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const suggestions: CleanupSuggestion[] = [];

    const addSuggestion = (
      type: CleanupSuggestion['type'],
      message: string,
      actions: BoardRecommendation[]
    ) => {
      if (actions.length === 0) {
        return;
      }
      suggestions.push({
        type,
        message,
        actions,
      });
    };

    const archiveActions: BoardRecommendation[] = [];
    const addDueActions: BoardRecommendation[] = [];
    const labelActions: BoardRecommendation[] = [];
    const emptyListActions: BoardRecommendation[] = [];
    const rebalanceActions: BoardRecommendation[] = [];
    const shiftOverdueActions: BoardRecommendation[] = [];
    const addChecklistActions: BoardRecommendation[] = [];

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

    const totalCards = snapshot.lists.reduce(
      (sum, list) => sum + list.cards.length,
      0
    );
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

    addSuggestion(
      'archive_old_done_cards',
      'Archiver les cartes terminées depuis plus de 30 jours.',
      archiveActions
    );
    addSuggestion(
      'add_missing_due_dates',
      'Ajouter des dates d’échéance aux cartes qui n’en ont pas.',
      addDueActions
    );
    addSuggestion(
      'label_missing',
      'Appliquer un label aux cartes non catégorisées.',
      labelActions
    );
    addSuggestion(
      'cleanup_empty_lists',
      'Archiver ou fusionner les listes vides.',
      emptyListActions
    );
    addSuggestion(
      'rebalance_lists',
      'Rééquilibrer les listes trop chargées vers Backlog.',
      rebalanceActions
    );
    addSuggestion(
      'shift_overdue',
      'Proposer un décalage de 3 jours pour les cartes en retard.',
      shiftOverdueActions
    );
    addSuggestion(
      'add_checklist_for_missing_process',
      'Ajouter une checklist de process aux cartes qui n’en ont pas.',
      addChecklistActions
    );

    return {
      boardName: snapshot.boardName,
      generatedAt: new Date().toISOString(),
      suggestions,
    };
  }

  /**
   * Génère un rapport exécutif complet du board (audit avancé + résumé GPT)
   */
  async generateBoardSummary(boardName: string): Promise<BoardSummaryReport> {
    if (!boardName || typeof boardName !== 'string') {
      throw new TrelloError('Le champ "boardName" est requis pour le résumé exécutif.');
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

      const openaiModule = await import('./openai.service');
      const OpenAIService =
        openaiModule.OpenAIService || (openaiModule as any).default;

      if (!OpenAIService) {
        throw new TrelloError(
          "Le service OpenAI n'est pas disponible pour générer le résumé exécutif."
        );
      }

      const openaiService = new OpenAIService();
      const rawSummary = await openaiService.callModel(instructions, {
        systemPrompt:
          'Tu es un consultant senior en gouvernance Trello. Tes réponses sont synthétiques, orientées décision, et toujours structurées.',
        temperature: 0.1,
      });

      let parsedSummary: {
        summary_text?: string;
        key_findings?: unknown;
        action_items?: unknown;
      } | null = null;

      const tryParse = (payload: string) => {
        try {
          return JSON.parse(payload);
        } catch {
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

      const summaryText =
        typeof parsedSummary?.summary_text === 'string'
          ? parsedSummary.summary_text.trim()
          : rawSummary.trim();

      const toStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) {
          return [];
        }
        return value
          .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
          .filter((item) => item.length > 0);
      };

      const keyFindings = toStringArray(
        parsedSummary?.key_findings || (parsedSummary as any)?.keyFindings
      );
      const actionItems = toStringArray(
        parsedSummary?.action_items || (parsedSummary as any)?.actionItems
      );

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
    } catch (error: any) {
      if (error instanceof TrelloError) {
        throw error;
      }
      throw new TrelloError(
        `Erreur lors de la génération du résumé exécutif: ${error.message}`,
        error.response?.status
      );
    }
  }
}

