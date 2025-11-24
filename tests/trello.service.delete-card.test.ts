import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - deleteCard', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: jest.fn(),
      put: jest.fn(),
      delete: mockDelete,
    } as any);
  });

  it('supprime une carte existante', async () => {
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
                id: 'card555',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockDelete.mockResolvedValue({
      data: { id: 'card555' },
    });

    const service = new TrelloService();
    const result = await service.deleteCard({ cardName: 'Budget Q1' });

    expect(mockDelete).toHaveBeenCalledWith('/cards/card555');
    expect(result).toEqual({
      cardName: 'Budget Q1',
      deleted: true,
    });
  });
});

