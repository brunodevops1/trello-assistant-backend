import { TrelloService } from '../src/services/trello.service';
import { BoardSnapshot, TrelloAction } from '../src/types/trello.types';

describe('TrelloService - auditHistory', () => {
  let service: TrelloService;
  let actionsSpy: jest.SpyInstance;
  let snapshotSpy: jest.SpyInstance;

  const now = Date.now();
  const actionsMock: TrelloAction[] = [
    {
      id: 'action1',
      type: 'commentCard',
      date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      data: { card: { id: 'card1', name: 'Carte active' } },
      memberCreator: { id: 'member1', fullName: 'Alice' },
    },
    {
      id: 'action2',
      type: 'commentCard',
      date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      data: { card: { id: 'card1', name: 'Carte active' } },
      memberCreator: { id: 'member1', fullName: 'Alice' },
    },
  ];

  const snapshotMock: BoardSnapshot = {
    boardName: 'Organisation',
    boardId: 'board1',
    lists: [
      {
        id: 'list1',
        name: 'À faire',
        cards: [
          {
            id: 'card1',
            name: 'Carte active',
            due: null,
            labels: [],
            members: [{ id: 'member1', fullName: 'Alice' }],
            checklists: [],
          } as any,
          {
            id: 'card2',
            name: 'Carte inactive',
            due: null,
            labels: [],
            members: [{ id: 'member2', fullName: 'Bob' }],
            checklists: [],
          } as any,
        ],
      },
    ],
    stats: {
      totalCards: 2,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      noDue: 2,
      unassigned: 0,
      withChecklists: 0,
      completedChecklists: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    actionsSpy = jest
      .spyOn(TrelloService.prototype as any, 'getBoardActions')
      .mockResolvedValue(actionsMock);
    snapshotSpy = jest
      .spyOn(TrelloService.prototype as any, 'getBoardSnapshot')
      .mockResolvedValue(snapshotMock);

    service = new TrelloService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("détecte les anomalies d'historique", async () => {
    const report = await service.auditHistory({ boardName: 'Organisation' });

    expect(actionsSpy).toHaveBeenCalled();
    expect(snapshotSpy).toHaveBeenCalledWith('Organisation');

    expect(report.boardName).toBe('Organisation');
    expect(report.periodAnalyzed.totalActions).toBe(actionsMock.length);

    const anomalyTypes = report.anomalies.map((a) => a.type);
    expect(anomalyTypes).toContain('stalled_card');
    expect(anomalyTypes).toContain('inactive_member');
    expect(anomalyTypes).toContain('no_activity_period');
  });
});

