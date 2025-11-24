import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - archiveCard', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();
  const mockPut = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: jest.fn(),
      put: mockPut,
      delete: jest.fn(),
    } as any);
  });

  it('archive une carte existante', async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board1', name: 'Organisation' }],
        });
      }

      if (url === '/search') {
        expect(config?.params?.query).toBe('Budget Q1');
        expect(config?.params?.idBoards).toBe('board1');
        return Promise.resolve({
          data: {
            cards: [
              {
                id: 'card777',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({
      data: {
        id: 'card777',
      },
    });

    const service = new TrelloService();
    const result = await service.archiveCard({ cardName: 'Budget Q1' });

    expect(mockPut).toHaveBeenCalledWith('/cards/card777', { closed: true });
    expect(result).toEqual({
      cardName: 'Budget Q1',
      archived: true,
    });
  });
});

