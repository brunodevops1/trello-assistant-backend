import { TrelloService } from '../src/services/trello.service';

describe('TrelloService.suggestBoardCleanup', () => {
  let service: TrelloService;
  let snapshotSpy: jest.SpiedFunction<TrelloService['getBoardSnapshot']>;
  const localSnapshot = {
    boardName: 'Organisation',
    boardId: 'board1',
    lists: [
      {
        id: 'list1',
        name: 'À faire',
        cards: [
          {
            id: 'card1',
            name: 'Carte sans due',
            due: null,
            dueComplete: false,
            labels: [],
            members: [],
            checklists: [],
          },
          {
            id: 'card2',
            name: 'Carte en retard',
            due: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            dueComplete: false,
            labels: [{ id: 'lab1' }],
            members: [],
            checklists: [{ id: 'chk1', items: [{ id: 'item1' }] }],
          },
          {
            id: 'card3',
            name: 'Carte terminée',
            due: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
            dueComplete: true,
            labels: [],
            members: [],
            checklists: [],
          },
        ],
      },
      { id: 'list2', name: 'Vide', cards: [] },
      {
        id: 'list3',
        name: 'Surchargée',
        cards: Array.from({ length: 10 }).map((_, idx) => ({
          id: `heavy-${idx}`,
          name: `Task ${idx}`,
          due: null,
          dueComplete: false,
          labels: [{ id: 'lab-heavy' }],
          members: [],
          checklists: [],
        })),
      },
    ],
    stats: {
      totalCards: 13,
      overdue: 1,
      dueToday: 0,
      dueThisWeek: 0,
      noDue: 1,
      unassigned: 3,
      withChecklists: 1,
      completedChecklists: 0,
    },
  };

  beforeEach(() => {
    process.env.TRELLO_API_KEY = process.env.TRELLO_API_KEY ?? 'test-key';
    process.env.TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN ?? 'test-token';

    service = new TrelloService();
    snapshotSpy = jest
      .spyOn(service, 'getBoardSnapshot')
      .mockResolvedValue(localSnapshot as any);
  });
  afterEach(() => {
    delete process.env.TRELLO_API_KEY;
    delete process.env.TRELLO_API_TOKEN;
    jest.restoreAllMocks();
  });

  it('génère un plan de nettoyage avec les suggestions attendues', async () => {
    const plan = await service.suggestBoardCleanup('Organisation');

    expect(snapshotSpy).toHaveBeenCalledWith('Organisation');
    expect(plan.boardName).toBe('Organisation');
    expect(plan.suggestions.length).toBeGreaterThan(0);

    const archiveSuggestion = plan.suggestions.find(
      (s) => s.type === 'archive_old_done_cards'
    );
    expect(archiveSuggestion).toBeDefined();
    expect(archiveSuggestion?.actions[0].action).toBe('archiveCard');

    const addDueSuggestion = plan.suggestions.find(
      (s) => s.type === 'add_missing_due_dates'
    );
    expect(addDueSuggestion).toBeDefined();

    const labelSuggestion = plan.suggestions.find(
      (s) => s.type === 'label_missing'
    );
    expect(labelSuggestion).toBeDefined();

    const emptyListSuggestion = plan.suggestions.find(
      (s) => s.type === 'cleanup_empty_lists'
    );
    expect(emptyListSuggestion).toBeDefined();

    const rebalanceSuggestion = plan.suggestions.find(
      (s) => s.type === 'rebalance_lists'
    );
    expect(rebalanceSuggestion).toBeDefined();

    const overdueSuggestion = plan.suggestions.find(
      (s) => s.type === 'shift_overdue'
    );
    expect(overdueSuggestion).toBeDefined();

    const checklistSuggestion = plan.suggestions.find(
      (s) => s.type === 'add_checklist_for_missing_process'
    );
    expect(checklistSuggestion).toBeDefined();
  });
});

