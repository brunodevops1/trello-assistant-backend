import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';
import { TrelloAction } from '../src/types/trello.types';

jest.mock('axios');

describe('TrelloService - getCardActions', () => {
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

  it('récupère les actions d’une carte avec les bons paramètres', async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/search') {
        expect(config?.params?.query).toBe('Budget Q1');
        expect(config?.params?.idBoards).toBe('board123');
        return Promise.resolve({
          data: {
            cards: [
              {
                id: 'card789',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      if (url === '/cards/card789/actions') {
        expect(config?.params).toEqual({
          filter: 'createCard,commentCard',
          since: '2025-11-01T00:00:00Z',
          before: '2025-11-10T00:00:00Z',
          limit: 10,
        });

        const actions: TrelloAction[] = [
          {
            id: 'action1',
            type: 'commentCard',
            date: '2025-11-02T00:00:00Z',
            data: {},
          },
        ];

        return Promise.resolve({ data: actions });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();

    const actions = await service.getCardActions({
      cardName: 'Budget Q1',
      board: 'Organisation',
      filter: ['createCard', 'commentCard'],
      since: '2025-11-01T00:00:00Z',
      before: '2025-11-10T00:00:00Z',
      limit: 10,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('commentCard');
    expect(mockGet).toHaveBeenCalledTimes(3);
  });
});

