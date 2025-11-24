import { TrelloService } from '../src/services/trello.service';
import {
  BoardSnapshot,
  SnapshotList,
  SnapshotCard,
} from '../src/types/trello.types';

describe('TrelloService - analyzeBoardHealth', () => {
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

  it('détecte les problèmes et recommandations attendus', async () => {
    const now = Date.now();
    const overdueCard: SnapshotCard = {
      id: 'card1',
      name: 'Carte en retard',
      desc: 'x'.repeat(2100),
      due: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      dueComplete: false,
      labels: [],
      members: [],
      checklists: [
        {
          id: 'chk1',
          name: 'Checklist vide',
          items: [],
        },
      ],
    };

    const dueSoonCard: SnapshotCard = {
      id: 'card2',
      name: 'Carte bientôt due',
      desc: 'Petite desc',
      due: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      dueComplete: false,
      labels: [{ name: 'Info', color: 'blue' }],
      members: [{ id: 'member1', fullName: 'Alice' }],
      checklists: [],
    };

    const noDueCard: SnapshotCard = {
      id: 'card3',
      name: 'Sans échéance',
      desc: 'Simple',
      due: null,
      dueComplete: false,
      labels: [],
      members: [],
      checklists: [],
    };

    const manyLabelsCard: SnapshotCard = {
      id: 'card4',
      name: 'Beaucoup de labels',
      desc: 'Desc',
      due: null,
      labels: [{}, {}, {}, {}, {}, {}],
      members: [],
      checklists: [],
    };

    snapshotMock.lists = [
      {
        id: 'listA',
        name: 'À faire',
        cards: [overdueCard, dueSoonCard],
      },
      {
        id: 'listB',
        name: 'En cours',
        cards: [noDueCard, manyLabelsCard],
      },
    ];

    jest
      .spyOn(TrelloService.prototype as any, 'getBoardSnapshot')
      .mockResolvedValue(snapshotMock);

    jest.spyOn(TrelloService.prototype as any, 'getBoardActions').mockResolvedValue([
      {
        id: 'action1',
        type: 'updateCard',
        date: new Date().toISOString(),
        data: { card: { id: 'card2' } },
        memberCreator: {},
      },
    ]);

    const report = await service.analyzeBoardHealth('Organisation');

    expect(report.boardName).toBe('Organisation');
    expect(report.problems.some((p) => p.type === 'overdue')).toBe(true);
    expect(report.problems.some((p) => p.type === 'due_soon')).toBe(true);
    expect(report.problems.some((p) => p.type === 'no_due_date')).toBe(true);
    expect(report.problems.some((p) => p.type === 'too_many_labels')).toBe(true);

    expect(
      report.recommendations.some(
        (r) => r.action === 'shiftDueDates' && r.cardId === 'card1'
      )
    ).toBe(true);
    expect(
      report.recommendations.some(
        (r) => r.action === 'applyLabel' && r.cardId === 'card3'
      )
    ).toBe(true);

    expect(report.health === 'medium' || report.health === 'bad').toBe(true);
  });
});

