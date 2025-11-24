import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - getBoardSnapshot', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: jest.fn(),
      put: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retourne un snapshot avec stats cohérentes', async () => {
    jest
      .spyOn(TrelloService.prototype as any, 'getBoard')
      .mockResolvedValue({ id: 'board123', name: 'Organisation' });

    mockGet.mockImplementation((url: string) => {
      if (url === `/boards/board123/lists`) {
        return Promise.resolve({
          data: [{ id: 'listA', name: 'À faire' }],
        });
      }

      if (url === `/lists/listA/cards`) {
        return Promise.resolve({
          data: [
            {
              id: 'card1',
              name: 'Carte 1',
              desc: 'Desc',
              due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              dueComplete: false,
              labels: [],
              members: [],
              checklists: [],
            },
            {
              id: 'card2',
              name: 'Carte 2',
              desc: '',
              due: null,
              dueComplete: false,
              labels: [],
              members: [],
              checklists: [
                {
                  id: 'chk1',
                  name: 'Checklist',
                  checkItems: [{ id: 'item1', name: 'Étape', state: 'complete' }],
                },
              ],
            },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const snapshot = await service.getBoardSnapshot('Organisation');

    expect(snapshot.boardName).toBe('Organisation');
    expect(snapshot.lists).toHaveLength(1);
    expect(snapshot.lists[0].cards).toHaveLength(2);
    expect(snapshot.stats.totalCards).toBe(2);
    expect(snapshot.stats.noDue).toBe(1);
    expect(snapshot.stats.withChecklists).toBe(1);
    expect(snapshot.stats.completedChecklists).toBeGreaterThanOrEqual(1);
  });
});

