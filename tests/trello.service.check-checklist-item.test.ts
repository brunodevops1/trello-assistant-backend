import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - checkChecklistItem', () => {
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

  it('coche un item dans une checklist', async () => {
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
            {
              id: 'check1',
              name: 'Préparation',
              checkItems: [
                { id: 'item1', name: 'Budget validé' },
                { id: 'item2', name: 'Design finalisé' },
              ],
            },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockImplementation((url: string, body?: any) => {
      if (url === '/cards/cardXYZ/checkItem/item1') {
        expect(body).toEqual({ state: 'complete' });
        return Promise.resolve({
          data: {
            state: 'complete',
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const result = await service.checkChecklistItem({
      cardName: 'Budget Q1',
      checklistName: 'Préparation',
      itemName: 'Budget validé',
    });

    expect(result).toEqual({
      cardName: 'Budget Q1',
      checklistName: 'Préparation',
      itemName: 'Budget validé',
      checklistId: 'check1',
      itemId: 'item1',
      state: 'complete',
    });
  });
});
