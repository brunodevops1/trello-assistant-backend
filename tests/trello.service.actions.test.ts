import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';
import { TrelloAction } from '../src/types/trello.types';

jest.mock('axios');

describe('TrelloService - getBoardActions', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = '';

    mockGet.mockReset();

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: jest.fn(),
      put: jest.fn(),
    } as any);
  });

  it('récupère les actions du board avec les bons paramètres', async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/boards/board123/actions') {
        expect(config?.params).toEqual({
          filter: 'createCard,updateCard',
          since: '2025-11-01T00:00:00Z',
          before: '2025-11-10T00:00:00Z',
          limit: 20,
        });

        const actions: TrelloAction[] = [
          {
            id: 'action1',
            type: 'createCard',
            date: '2025-11-02T00:00:00Z',
            data: {},
          },
        ];

        return Promise.resolve({ data: actions });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();

    const actions = await service.getBoardActions({
      boardName: 'Organisation',
      filter: ['createCard', 'updateCard'],
      since: '2025-11-01T00:00:00Z',
      before: '2025-11-10T00:00:00Z',
      limit: 20,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('action1');
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

