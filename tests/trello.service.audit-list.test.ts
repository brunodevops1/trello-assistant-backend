import { TrelloService } from '../src/services/trello.service';
import {
  BoardSnapshot,
  SnapshotList,
  SnapshotCard,
} from '../src/types/trello.types';
import { ListNotFoundError } from '../src/utils/errors';

describe('TrelloService - auditList', () => {
  let service: TrelloService;
  const snapshotMock: BoardSnapshot = {
    boardName: 'Organisation',
    boardId: 'board123',
    lists: [] as SnapshotList[],
    stats: {
      totalCards: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      noDue: 0,
      unassigned: 0,
      withChecklists: 0,
      completedChecklists: 0,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    service = new TrelloService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retourne un audit correct pour une liste donnée', async () => {
    const now = Date.now();
    const overdueCard: SnapshotCard = {
      id: 'card1',
      name: 'Retard',
      desc: 'Desc',
      due: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      dueComplete: false,
      labels: [],
      members: [],
      checklists: [],
    };

    snapshotMock.lists = [
      {
        id: 'listA',
        name: 'À faire',
        cards: [overdueCard],
      },
    ];

    jest
      .spyOn(TrelloService.prototype as any, 'getBoardSnapshot')
      .mockResolvedValue(snapshotMock);

    jest.spyOn(TrelloService.prototype as any, 'getBoardActions').mockResolvedValue([]);

    const report = await service.auditList('Organisation', 'À faire');

    expect(report.listName).toBe('À faire');
    expect(report.problems.some((p) => p.type === 'overdue')).toBe(true);
    expect(report.health === 'medium' || report.health === 'bad').toBe(true);
    expect(report.recommendations.some((r) => r.action === 'shiftDueDates')).toBe(true);
  });

  it('throw ListNotFoundError si la liste est absente', async () => {
    snapshotMock.lists = [];
    jest
      .spyOn(TrelloService.prototype as any, 'getBoardSnapshot')
      .mockResolvedValue(snapshotMock);

    await expect(service.auditList('Organisation', 'À faire')).rejects.toBeInstanceOf(
      ListNotFoundError
    );
  });
});

