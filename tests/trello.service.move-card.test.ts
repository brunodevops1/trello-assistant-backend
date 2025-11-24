import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - moveCardToList', () => {
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
    } as any);
  });

  it('déplace une carte vers une autre liste', async () => {
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
                id: 'card999',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      if (url === '/cards/card999') {
        return Promise.resolve({
          data: {
            id: 'card999',
            name: 'Budget Q1',
            idList: 'listOld',
            idBoard: 'board123',
          },
        });
      }

      if (url === '/lists/listOld') {
        return Promise.resolve({
          data: {
            id: 'listOld',
            name: 'À faire',
          },
        });
      }

      if (url === '/boards/board123/lists') {
        return Promise.resolve({
          data: [
            { id: 'listOld', name: 'À faire' },
            { id: 'listNew', name: 'En cours' },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({
      data: {
        id: 'card999',
      },
    });

    const service = new TrelloService();
    const moved = await service.moveCardToList({
      cardName: 'Budget Q1',
      listName: 'En cours',
    });

    expect(mockPut).toHaveBeenCalledWith('/cards/card999', {
      idList: 'listNew',
    });
    expect(moved).toEqual({
      cardName: 'Budget Q1',
      oldList: 'À faire',
      newList: 'En cours',
    });
  });
});

