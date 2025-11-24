import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - createChecklist', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: jest.fn(),
      delete: jest.fn(),
    } as any);
  });

  it('crée une checklist avec des items', async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'boardX', name: 'Organisation' }],
        });
      }

      if (url === '/search') {
        expect(config?.params?.query).toBe('Budget Q1');
        expect(config?.params?.idBoards).toBe('boardX');
        return Promise.resolve({
          data: {
            cards: [
              {
                id: 'cardABC',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPost.mockImplementation((url: string, body?: any) => {
      if (url === '/cards/cardABC/checklists') {
        expect(body).toEqual({ name: 'Checklist Lancement' });
        return Promise.resolve({
          data: {
            id: 'check123',
            name: 'Checklist Lancement',
          },
        });
      }

      if (url === '/checklists/check123/checkItems') {
        expect(['Budget', 'Design']).toContain(body.name);
        return Promise.resolve({
          data: {
            id: `item_${body.name}`,
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const result = await service.createChecklist({
      cardName: 'Budget Q1',
      checklistName: 'Checklist Lancement',
      items: ['Budget', 'Design'],
    });

    expect(result).toEqual({
      cardName: 'Budget Q1',
      checklistName: 'Checklist Lancement',
      checklistId: 'check123',
      items: ['Budget', 'Design'],
    });
  });
});

