import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - listBoardLabels', () => {
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
      delete: jest.fn(),
    } as any);
  });

  it('retourne les labels du board par défaut', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'boardABC', name: 'Organisation' }],
        });
      }

      if (url === '/boards/boardABC/labels') {
        return Promise.resolve({
          data: [
            { id: 'label1', name: 'Urgent', color: 'red' },
            { id: 'label2', name: 'Info', color: 'blue' },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const service = new TrelloService();
    const labels = await service.listBoardLabels({ boardName: 'Organisation' });

    expect(labels).toHaveLength(2);
    expect(labels[0].name).toBe('Urgent');
  });
});

