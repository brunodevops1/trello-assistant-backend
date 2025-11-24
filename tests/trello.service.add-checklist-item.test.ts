import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - addChecklistItem', () => {
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

  it('ajoute un item dans une checklist existante', async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'boardZ', name: 'Organisation' }],
        });
      }

      if (url === '/search') {
        expect(config?.params?.query).toBe('Budget Q1');
        expect(config?.params?.idBoards).toBe('boardZ');
        return Promise.resolve({
          data: {
            cards: [
              {
                id: 'cardXYZ',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      if (url === '/cards/cardXYZ/checklists') {
        return Promise.resolve({
          data: [
            { id: 'check1', name: 'Préparation' },
            { id: 'check2', name: 'Suivi' },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPost.mockImplementation((url: string, body?: any) => {
      if (url === '/checklists/check1/checkItems') {
        expect(body).toEqual({ name: 'Validation budget' });
        return Promise.resolve({
          data: {
            id: 'item123',
            name: 'Validation budget',
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const result = await service.addChecklistItem({
      cardName: 'Budget Q1',
      checklistName: 'Préparation',
      itemName: 'Validation budget',
    });

    expect(result).toEqual({
      cardName: 'Budget Q1',
      checklistName: 'Préparation',
      itemName: 'Validation budget',
      checklistId: 'check1',
      itemId: 'item123',
    });
  });
});

