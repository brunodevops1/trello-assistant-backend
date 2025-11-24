/**
 * Types pour les interactions avec Trello
 */

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete: boolean;
  idList: string;
  idBoard: string;
  labels: TrelloLabel[];
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
}

export interface CreateTaskParams {
  board?: string;
  list?: string;
  title: string;
  due_date?: string;
}

export interface CompleteTaskParams {
  board?: string;
  task_name: string;
}

export interface UpdateDueDateParams {
  board?: string;
  task_name: string;
  due_date: string;
}

export interface ArchiveTaskParams {
  board?: string;
  task_name: string;
}

export interface MoveTaskParams {
  board?: string;
  task_name: string;
  target_list: string;
}

export interface GetBoardActionsOptions {
  boardName: string;
  filter?: string[];
  since?: string;
  before?: string;
  limit?: number;
}

export interface TrelloAction {
  id: string;
  type: string;
  date: string;
  data: Record<string, any>;
  memberCreator?: Record<string, any>;
  [key: string]: any;
}

export interface GetCardActionsOptions {
  cardName: string;
  board?: string;
  filter?: string[];
  since?: string;
  before?: string;
  limit?: number;
}

export interface ImproveCardDescriptionOptions {
  cardName: string;
  instructions?: string;
}

export interface UpdateCardFieldOptions {
  cardName: string;
  field: string;
  value: string;
}

export interface MoveCardToListOptions {
  cardName: string;
  listName: string;
}

export interface DeleteCardOptions {
  cardName: string;
}

export interface ArchiveCardOptions {
  cardName: string;
}

export interface CreateChecklistOptions {
  cardName: string;
  checklistName: string;
  items?: string[];
}

export interface AddChecklistItemOptions {
  cardName: string;
  checklistName: string;
  itemName: string;
}

export interface CheckChecklistItemOptions {
  cardName: string;
  checklistName: string;
  itemName: string;
}

export interface AddLabelOptions {
  cardName: string;
  labelNameOrColor: string;
}

export interface ListBoardLabelsOptions {
  boardName: string;
}


export interface ShiftDueDatesOptions {
  listName: string;
  days: number;
}

export interface ShiftedDueDate {
  cardName: string;
  oldDue: string;
  newDue: string;
}

export interface ListOverdueTasksOptions {
  boardName: string;
}

export interface OverdueTask {
  cardName: string;
  listName: string;
  due: string;
  overdueByDays: number;
}

export interface SortListByDueDateOptions {
  listName: string;
  order: 'asc' | 'desc';
}

export interface SortedCardPosition {
  cardName: string;
  due: string;
  newPos: number;
}

export interface PrioritizeListOptions {
  listName: string;
}

export interface PrioritizedCard {
  cardName: string;
  due: string | null;
  priorityScore: number;
  newPos: number;
}

export type GroupCriteria = 'label' | 'member' | 'due';

export interface GroupCardsOptions {
  boardName: string;
  criteria: GroupCriteria;
}

export interface GroupResult {
  groupName: string;
  cardCount: number;
  cards: {
    cardName: string;
    listBefore: string;
    listAfter: string;
  }[];
}

export interface GroupCardsResult {
  criteria: GroupCriteria;
  groups: GroupResult[];
}

export interface SnapshotCard {
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
    items: {
      id: string;
      name: string;
      state: string;
    }[];
  }[];
}

export interface SnapshotList {
  id: string;
  name: string;
  cards: SnapshotCard[];
}

export interface BoardSnapshot {
  boardName: string;
  boardId: string;
  lists: SnapshotList[];
  stats: {
    totalCards: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    noDue: number;
    unassigned: number;
    withChecklists: number;
    completedChecklists: number;
  };
}

export interface BoardProblem {
  type:
    | 'overdue'
    | 'due_soon'
    | 'no_due_date'
    | 'unassigned'
    | 'empty_checklist'
    | 'stalled'
    | 'no_label'
    | 'long_description'
    | 'too_many_labels';
  cardId: string;
  cardName: string;
  listName: string;
  details?: any;
}

export interface BoardRecommendation {
  action:
    | 'updateDueDate'
    | 'shiftDueDates'
    | 'applyLabel'
    | 'moveCardToList'
    | 'archiveCard'
    | 'addChecklistItem'
    | 'archiveList';
  cardId?: string;
  listName?: string;
  suggestedValue?: any;
}

export interface BoardHealthReport {
  boardName: string;
  generatedAt: string;
  health: 'good' | 'medium' | 'bad';
  problems: BoardProblem[];
  recommendations: BoardRecommendation[];
}

export interface ListAuditReport {
  boardName: string;
  listName: string;
  generatedAt: string;
  health: 'good' | 'medium' | 'bad';
  problems: BoardProblem[];
  recommendations: BoardRecommendation[];
}

export interface CleanupSuggestion {
  type:
    | 'archive_old_done_cards'
    | 'add_missing_due_dates'
    | 'label_missing'
    | 'cleanup_empty_lists'
    | 'rebalance_lists'
    | 'shift_overdue'
    | 'add_checklist_for_missing_process';
  message: string;
  actions: BoardRecommendation[];
}

export interface BoardCleanupPlan {
  boardName: string;
  generatedAt: string;
  suggestions: CleanupSuggestion[];
}

export interface HistoryAnomaly {
  type:
    | 'stalled_card'
    | 'inactive_member'
    | 'high_activity_spike'
    | 'no_activity_period'
    | 'frequent_moves'
    | 'long_cycle_time';
  message: string;
  details?: Record<string, any>;
}

export interface HistoryAuditReport {
  boardName: string;
  generatedAt: string;
  periodAnalyzed: {
    since?: string;
    before?: string;
    totalActions: number;
  };
  anomalies: HistoryAnomaly[];
}

export interface BoardSummaryReport {
  boardName: string;
  generatedAt: string;
  snapshot: BoardSnapshot;
  healthReport: BoardHealthReport;
  historyReport: HistoryAuditReport;
  cleanupPlan: BoardCleanupPlan;
  summaryText: string;
  keyFindings: string[];
  actionItems: string[];
}

