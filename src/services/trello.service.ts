/**
 * Service pour interagir avec l'API Trello
 */

import axios, { AxiosInstance } from 'axios';
import {
  TrelloCard,
  TrelloList,
  TrelloBoard,
  CreateTaskParams,
  CompleteTaskParams,
  UpdateDueDateParams,
  ArchiveTaskParams,
  MoveTaskParams,
} from '../types/trello.types';
import {
  TrelloError,
  TaskNotFoundError,
  MultipleTasksFoundError,
  BoardNotFoundError,
  ListNotFoundError,
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
}

