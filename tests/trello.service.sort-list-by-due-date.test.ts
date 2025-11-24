import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - sortListByDueDate', () => {
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

  it('trie les cartes de la liste dans l’ordre ascendant et positionne les cartes', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/boards/board123/lists') {
        return Promise.resolve({
          data: [
            { id: 'listABC', name: 'À faire' },
            { id: 'listDEF', name: 'En cours' },
          ],
        });
      }

      if (url === '/lists/listABC/cards') {
        return Promise.resolve({
          data: [
            { id: 'card1', name: 'Carte A', due: '2025-01-10T10:00:00.000Z' },
            { id: 'card2', name: 'Carte B', due: null },
            { id: 'card3', name: 'Carte C', due: '2025-01-08T08:00:00.000Z' },
            { id: 'card4', name: 'Carte D', due: 'invalid-date' },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({ data: {} });

    const service = new TrelloService();
    const sorted = await service.sortListByDueDate({
      listName: 'À faire',
      order: 'asc',
    });

    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenNthCalledWith(1, '/cards/card3', { pos: 1 });
    expect(mockPut).toHaveBeenNthCalledWith(2, '/cards/card1', { pos: 2 });

    expect(sorted).toEqual([
      {
        cardName: 'Carte C',
        due: '2025-01-08T08:00:00.000Z',
        newPos: 1,
      },
      {
        cardName: 'Carte A',
        due: '2025-01-10T10:00:00.000Z',
        newPos: 2,
      },
    ]);
  });
});

