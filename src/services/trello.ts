import { TrelloService } from './trello.service';
import { GroupCriteria } from '../types/trello.types';

type HandlerParams = Record<string, any>;

export interface ToolHandlerResult {
  message: string;
  data?: any;
}

let trelloServiceInstance: TrelloService | null = null;

function getTrelloServiceInstance(): TrelloService {
  if (!trelloServiceInstance) {
    trelloServiceInstance = new TrelloService();
  }
  return trelloServiceInstance;
}

function pickFirstString(...candidates: any[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
}

function parseFilters(value: unknown): string[] | undefined {
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

function parseLimit(value: unknown): number | undefined {
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

function ensureString(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Le paramètre "${field}" est requis.`);
  }
  return value;
}

function ensureAllowedCriteria(criteria: unknown): GroupCriteria {
  const allowed: GroupCriteria[] = ['label', 'member', 'due'];
  if (typeof criteria !== 'string' || !allowed.includes(criteria as GroupCriteria)) {
    throw new Error('Le paramètre "criteria" doit être "label", "member" ou "due"');
  }
  return criteria as GroupCriteria;
}

function parseItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function parseDays(value: unknown): number {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : NaN;

  if (Number.isNaN(numeric)) {
    throw new Error('Le paramètre "days" doit être un nombre pour shiftDueDates');
  }
  return numeric;
}

export async function createTrelloTask(params: HandlerParams): Promise<ToolHandlerResult> {
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

export async function completeTrelloTask(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const board = pickFirstString(params.board, params.board_name, params.boardName);
  const taskName = pickFirstString(
    params.task_name,
    params.card_name,
    params.taskName,
    params.cardName
  );

  if (!taskName) {
    throw new Error(
      'Le paramètre "task_name" (ou "card_name") est requis pour completeTrelloTask'
    );
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

export async function updateTrelloDueDate(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const board = pickFirstString(params.board, params.board_name, params.boardName);
  const taskName = pickFirstString(
    params.task_name,
    params.card_name,
    params.taskName,
    params.cardName
  );
  const dueDate = pickFirstString(params.due_date, params.dueDate);

  if (!taskName || !dueDate) {
    throw new Error(
      'Les paramètres "task_name" (ou "card_name") et "due_date" sont requis pour updateTrelloDueDate'
    );
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

export async function archiveTrelloTask(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const board = pickFirstString(params.board, params.board_name, params.boardName);
  const taskName = pickFirstString(
    params.task_name,
    params.card_name,
    params.taskName,
    params.cardName
  );

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

export async function moveTrelloTask(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const board = pickFirstString(params.board, params.board_name, params.boardName);
  const taskName = pickFirstString(
    params.task_name,
    params.card_name,
    params.taskName,
    params.cardName
  );
  const targetList = pickFirstString(
    params.target_list,
    params.list_name,
    params.listName,
    params.targetList
  );

  if (!taskName || !targetList) {
    throw new Error(
      'Les paramètres "task_name" (ou "card_name") et "target_list" (ou "list_name") sont requis pour moveTrelloTask'
    );
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

export async function getBoardActions(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );
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

export async function getCardActions(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
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

export async function improveCardDescription(
  params: HandlerParams
): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
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

export async function updateCardField(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
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

export async function moveCardToList(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
  const listName = ensureString(
    pickFirstString(params.list_name, params.listName),
    'list_name'
  );

  const moved = await trelloService.moveCardToList({
    cardName,
    listName,
  });

  return {
    message: `Carte déplacée : "${cardName}" → liste "${listName}"`,
    data: moved,
  };
}

export async function deleteCard(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );

  const deleted = await trelloService.deleteCard({ cardName });

  return {
    message: `Carte supprimée : "${cardName}"`,
    data: deleted,
  };
}

export async function archiveCard(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );

  const archived = await trelloService.archiveCard({ cardName });

  return {
    message: `Carte archivée : "${cardName}"`,
    data: archived,
  };
}

export async function createChecklist(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
  const checklistName = ensureString(
    pickFirstString(params.checklist_name, params.checklistName),
    'checklist_name'
  );
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

export async function addChecklistItem(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
  const checklistName = ensureString(
    pickFirstString(params.checklist_name, params.checklistName),
    'checklist_name'
  );
  const itemName = ensureString(
    pickFirstString(params.item_name, params.itemName),
    'item_name'
  );

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

export async function checkChecklistItem(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
  const checklistName = ensureString(
    pickFirstString(params.checklist_name, params.checklistName),
    'checklist_name'
  );
  const itemName = ensureString(
    pickFirstString(params.item_name, params.itemName),
    'item_name'
  );

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

export async function addLabel(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const cardName = ensureString(
    pickFirstString(params.card_name, params.cardName),
    'card_name'
  );
  const labelNameOrColor = ensureString(
    pickFirstString(params.label_name_or_color, params.labelNameOrColor),
    'label_name_or_color'
  );

  const label = await trelloService.addLabel({
    cardName,
    labelNameOrColor,
  });

  return {
    message: `Label "${labelNameOrColor}" ajouté à la carte "${cardName}"`,
    data: label,
  };
}

export async function shiftDueDates(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const listName = ensureString(
    pickFirstString(params.list_name, params.listName),
    'list_name'
  );
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

export async function listBoardLabels(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );

  const labels = await trelloService.listBoardLabels({
    boardName,
  });

  return {
    message: `Labels récupérés pour le board "${boardName}" (${labels.length})`,
    data: { labels },
  };
}

export async function listOverdueTasks(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );

  const overdue = await trelloService.listOverdueTasks({
    boardName,
  });

  return {
    message: `Tâches en retard récupérées pour le board "${boardName}" (${overdue.length})`,
    data: { overdue },
  };
}

export async function sortListByDueDate(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const listName = ensureString(
    pickFirstString(params.list_name, params.listName),
    'list_name'
  );

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

export async function prioritizeList(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const listName = ensureString(
    pickFirstString(params.list_name, params.listName),
    'list_name'
  );

  const prioritized = await trelloService.prioritizeList({
    listName,
  });

  return {
    message: `Liste "${listName}" réorganisée selon la priorité.`,
    data: { prioritized },
  };
}

export async function groupCards(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );
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

export async function getBoardSnapshot(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );

  const snapshot = await trelloService.getBoardSnapshot(boardName);

  return {
    message: `Snapshot récupéré pour le board "${boardName}"`,
    data: snapshot,
  };
}

export async function analyzeBoardHealth(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );

  const report = await trelloService.analyzeBoardHealth(boardName);

  return {
    message: `Audit réalisé sur le board "${boardName}"`,
    data: report,
  };
}

export async function auditList(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );
  const listName = ensureString(
    pickFirstString(params.list_name, params.listName),
    'list_name'
  );

  const report = await trelloService.auditList(boardName, listName);

  return {
    message: `Audit réalisé sur la liste "${listName}" du board "${boardName}"`,
    data: report,
  };
}

export async function auditHistory(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );
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

export async function generateBoardSummary(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );

  const report = await trelloService.generateBoardSummary(boardName);

  return {
    message: `Résumé exécutif généré pour le board "${boardName}"`,
    data: report,
  };
}

export async function suggestBoardCleanup(params: HandlerParams): Promise<ToolHandlerResult> {
  const trelloService = getTrelloServiceInstance();
  const boardName = ensureString(
    pickFirstString(params.board, params.board_name, params.boardName),
    'board_name'
  );

  const plan = await trelloService.suggestBoardCleanup(boardName);

  return {
    message: `Plan de nettoyage généré pour le board "${boardName}"`,
    data: plan,
  };
}

export type TrelloToolHandler = (params: HandlerParams) => Promise<ToolHandlerResult>;

export const trelloToolHandlers: Record<string, TrelloToolHandler> = {
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


