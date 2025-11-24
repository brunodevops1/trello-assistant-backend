import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - addLabel', () => {
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

  it('ajoute un label existant par nom', async () => {
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
                id: 'cardABC',
                name: 'Budget Q1',
                idBoard: 'board123',
              },
            ],
          },
        });
      }

      if (url === '/boards/board123/labels') {
        return Promise.resolve({
          data: [
            { id: 'labelUrgent', name: 'Urgent', color: 'red' },
            { id: 'labelInfo', name: 'Info', color: 'blue' },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPost.mockImplementation((url: string, body?: any) => {
      if (url === '/cards/cardABC/idLabels') {
        expect(body).toEqual({ value: 'labelUrgent' });
        return Promise.resolve({
          data: {},
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const result = await service.addLabel({
      cardName: 'Budget Q1',
      labelNameOrColor: 'Urgent',
    });

    expect(result).toEqual({
      cardName: 'Budget Q1',
      labelId: 'labelUrgent',
      labelName: 'Urgent',
      labelColor: 'red',
      attached: true,
    });
  });
});

