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
  color: string;
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

