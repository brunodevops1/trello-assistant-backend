import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - prioritizeList', () => {
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

  it('réordonne les cartes selon leur score de priorité', async () => {
    const now = Date.now();
    const pastDue = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const soonDue = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const farDue = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

    mockGet.mockImplementation((url: string) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/boards/board123/lists') {
        return Promise.resolve({
          data: [
            { id: 'listABC', name: 'Interventions' },
            { id: 'listDEF', name: 'Divers' },
          ],
        });
      }

      if (url === '/lists/listABC/cards') {
        return Promise.resolve({
          data: [
            {
              id: 'card1',
              name: 'Incident critique',
              due: pastDue,
              labels: [{ name: 'Urgent', color: 'red' }],
            },
            {
              id: 'card2',
              name: 'Suivi client',
              due: soonDue,
              labels: [{ name: 'Info', color: 'blue' }],
            },
            {
              id: 'card3',
              name: 'Documentation',
              due: null,
              labels: [],
            },
            {
              id: 'card4',
              name: 'Maintenance préventive',
              due: farDue,
              labels: [],
            },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({ data: {} });

    const service = new TrelloService();
    const prioritized = await service.prioritizeList({
      listName: 'Interventions',
    });

    expect(mockPut).toHaveBeenCalledTimes(4);
    expect(mockPut).toHaveBeenNthCalledWith(1, '/cards/card1', { pos: 1 });
    expect(mockPut).toHaveBeenNthCalledWith(2, '/cards/card2', { pos: 2 });
    expect(mockPut).toHaveBeenNthCalledWith(3, '/cards/card3', { pos: 3 });
    expect(mockPut).toHaveBeenNthCalledWith(4, '/cards/card4', { pos: 4 });

    expect(prioritized[0]).toEqual(
      expect.objectContaining({
        cardName: 'Incident critique',
        priorityScore: expect.any(Number),
        newPos: 1,
      })
    );
    expect(prioritized[1].cardName).toBe('Suivi client');
    expect(prioritized[2].cardName).toBe('Documentation');
    expect(prioritized[3].cardName).toBe('Maintenance préventive');

    expect(prioritized[0].priorityScore).toBeGreaterThan(
      prioritized[1].priorityScore
    );
    expect(prioritized[1].priorityScore).toBeGreaterThan(
      prioritized[2].priorityScore
    );
  });
});

