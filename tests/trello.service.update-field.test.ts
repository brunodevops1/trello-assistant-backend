import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - updateCardField', () => {
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

  it('met à jour un champ de carte avec les bons paramètres', async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/search') {
        expect(config?.params?.idBoards).toBe('board123');
        expect(config?.params?.query).toBe('Budget Q1');
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

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({
      data: {
        id: 'card789',
      },
    });

    const service = new TrelloService();
    const update = await service.updateCardField({
      cardName: 'Budget Q1',
      field: 'name',
      value: 'Budget Q1 - Final',
    });

    expect(mockPut).toHaveBeenCalledWith('/cards/card789', {
      name: 'Budget Q1 - Final',
    });
    expect(update).toEqual({
      cardName: 'Budget Q1',
      field: 'name',
      value: 'Budget Q1 - Final',
    });
  });
});

