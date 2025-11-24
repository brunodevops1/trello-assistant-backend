import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

const mockGenerateText = jest.fn();

jest.mock('../src/services/openai.service', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateText: mockGenerateText,
  })),
}));

describe('TrelloService - improveCardDescription', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();
  const mockPut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateText.mockReset();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    mockGet.mockReset();
    mockPut.mockReset();

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: jest.fn(),
      put: mockPut,
    } as any);
  });

  it('améliore la description et met à jour la carte', async () => {
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
                id: 'card456',
                name: 'Budget Q1',
              },
            ],
          },
        });
      }

      if (url === '/cards/card456') {
        return Promise.resolve({
          data: {
            id: 'card456',
            desc: 'Ancienne description peu claire',
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({
      data: {
        id: 'card456',
      },
    });

    mockGenerateText.mockResolvedValue('Nouvelle description optimisée');

    const service = new TrelloService();
    const result = await service.improveCardDescription({
      cardName: 'Budget Q1',
      instructions: 'Ton professionnel et concis',
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.stringContaining('Ton professionnel et concis')
    );
    expect(mockPut).toHaveBeenCalledWith('/cards/card456', {
      desc: 'Nouvelle description optimisée',
    });
    expect(result).toEqual({ updated: 'Nouvelle description optimisée' });
  });
});

