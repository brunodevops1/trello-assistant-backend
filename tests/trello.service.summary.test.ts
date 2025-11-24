import { TrelloService } from '../src/services/trello.service';
import {
  BoardSnapshot,
  BoardHealthReport,
  HistoryAuditReport,
  BoardCleanupPlan,
} from '../src/types/trello.types';

const mockCallModel = jest.fn();

jest.mock('../src/services/openai.service', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    callModel: mockCallModel,
    generateText: jest.fn(),
  })),
}));

describe('TrelloService - generateBoardSummary', () => {
  let service: TrelloService;
  let snapshotSpy: jest.SpyInstance;
  let healthSpy: jest.SpyInstance;
  let historySpy: jest.SpyInstance;
  let cleanupSpy: jest.SpyInstance;

  const snapshotMock: BoardSnapshot = {
    boardName: 'Organisation',
    boardId: 'board-1',
    lists: [],
    stats: {
      totalCards: 3,
      overdue: 1,
      dueToday: 0,
      dueThisWeek: 2,
      noDue: 1,
      unassigned: 1,
      withChecklists: 1,
      completedChecklists: 0,
    },
  };

  const healthReportMock: BoardHealthReport = {
    boardName: 'Organisation',
    generatedAt: new Date().toISOString(),
    health: 'medium',
    problems: [],
    recommendations: [],
  };

  const historyReportMock: HistoryAuditReport = {
    boardName: 'Organisation',
    generatedAt: new Date().toISOString(),
    periodAnalyzed: {
      totalActions: 12,
    },
    anomalies: [],
  };

  const cleanupPlanMock: BoardCleanupPlan = {
    boardName: 'Organisation',
    generatedAt: new Date().toISOString(),
    suggestions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    snapshotSpy = jest
      .spyOn(TrelloService.prototype as any, 'getBoardSnapshot')
      .mockResolvedValue(snapshotMock);
    healthSpy = jest
      .spyOn(TrelloService.prototype as any, 'analyzeBoardHealth')
      .mockResolvedValue(healthReportMock);
    historySpy = jest
      .spyOn(TrelloService.prototype as any, 'auditHistory')
      .mockResolvedValue(historyReportMock);
    cleanupSpy = jest
      .spyOn(TrelloService.prototype as any, 'suggestBoardCleanup')
      .mockResolvedValue(cleanupPlanMock);

    mockCallModel.mockResolvedValue(
      JSON.stringify({
        summary_text: 'Synthèse claire du board.',
        key_findings: ['Backlog en hausse'],
        action_items: ['Organiser un point hebdo'],
      })
    );

    service = new TrelloService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('combine les analyses et retourne un rapport complet', async () => {
    const report = await service.generateBoardSummary('Organisation');

    expect(snapshotSpy).toHaveBeenCalledWith('Organisation');
    expect(healthSpy).toHaveBeenCalledWith('Organisation');
    expect(historySpy).toHaveBeenCalledWith({ boardName: 'Organisation' });
    expect(cleanupSpy).toHaveBeenCalledWith('Organisation');

    expect(mockCallModel).toHaveBeenCalledTimes(1);
    expect(mockCallModel.mock.calls[0][0]).toContain('Organisation');

    expect(report.boardName).toBe('Organisation');
    expect(report.snapshot).toBe(snapshotMock);
    expect(report.healthReport).toBe(healthReportMock);
    expect(report.historyReport).toBe(historyReportMock);
    expect(report.cleanupPlan).toBe(cleanupPlanMock);
    expect(report.summaryText).toBe('Synthèse claire du board.');
    expect(report.keyFindings).toEqual(['Backlog en hausse']);
    expect(report.actionItems).toEqual(['Organiser un point hebdo']);
  });
});

