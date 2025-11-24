import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - listOverdueTasks', () => {
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

  it('retourne uniquement les cartes réellement en retard', async () => {
    const now = Date.now();
    const overdueOne = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    const overdueTwo = new Date(now - 1.5 * 24 * 60 * 60 * 1000).toISOString();
    const notOverdue = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString();

    mockGet.mockImplementation((url: string) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/boards/board123/lists') {
        return Promise.resolve({
          data: [
            { id: 'listA', name: 'À faire' },
            { id: 'listB', name: 'En cours' },
          ],
        });
      }

      if (url === '/lists/listA/cards') {
        return Promise.resolve({
          data: [
            { id: 'card1', name: 'Ancienne tâche', due: overdueOne, dueComplete: false },
            { id: 'card2', name: 'Tâche terminée', due: overdueTwo, dueComplete: true },
            { id: 'card3', name: 'Pas d’échéance', due: null, dueComplete: false },
            { id: 'card4', name: 'Pas encore en retard', due: notOverdue, dueComplete: false },
          ],
        });
      }

      if (url === '/lists/listB/cards') {
        return Promise.resolve({
          data: [
            { id: 'card5', name: 'Très en retard', due: overdueTwo, dueComplete: false },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const overdue = await service.listOverdueTasks({ boardName: 'Organisation' });

    expect(overdue).toHaveLength(2);
    expect(overdue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardName: 'Ancienne tâche',
          listName: 'À faire',
          due: overdueOne,
          overdueByDays: expect.any(Number),
        }),
        expect.objectContaining({
          cardName: 'Très en retard',
          listName: 'En cours',
          due: overdueTwo,
          overdueByDays: expect.any(Number),
        }),
      ])
    );

    overdue.forEach((task) => {
      expect(task.overdueByDays).toBeGreaterThanOrEqual(1);
    });
  });
});

