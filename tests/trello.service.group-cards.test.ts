import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - groupCards', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockPut = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TRELLO_API_KEY = 'test_key';
    process.env.TRELLO_API_TOKEN = 'test_token';
    process.env.TRELLO_DEFAULT_BOARD_ID = 'Organisation';

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: mockPut,
    } as any);
  });

  it('groupe par label et crée les listes manquantes', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === `/boards/board123/lists`) {
        return Promise.resolve({
          data: [
            { id: 'listA', name: 'À faire' },
            { id: 'listB', name: 'En cours' },
          ],
        });
      }

      if (url === `/lists/listA/cards`) {
        return Promise.resolve({
          data: [
            {
              id: 'card1',
              name: 'Carte Urgente',
              due: null,
              labels: [{ name: 'Urgent', color: 'red' }],
              idMembers: [],
              idList: 'listA',
            },
            {
              id: 'card2',
              name: 'Sans label',
              due: null,
              labels: [],
              idMembers: [],
              idList: 'listA',
            },
          ],
        });
      }

      if (url === `/lists/listB/cards`) {
        return Promise.resolve({
          data: [
            {
              id: 'card3',
              name: 'Projet Bleu',
              due: null,
              labels: [{ name: null, color: 'blue' }],
              idMembers: [],
              idList: 'listB',
            },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPost.mockImplementation((url: string, body: any) => {
      if (url === '/lists') {
        return Promise.resolve({
          data: { id: `new_${body.name}`, name: body.name },
        });
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    mockPut.mockResolvedValue({ data: {} });

    const service = new TrelloService();
    const result = await service.groupCards({
      boardName: 'Organisation',
      criteria: 'label',
    });

    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(mockPut).toHaveBeenCalledTimes(3);
    expect(result.criteria).toBe('label');
    expect(result.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupName: 'Urgent',
          cardCount: 1,
        }),
        expect.objectContaining({
          groupName: 'No Label',
          cardCount: 1,
        }),
        expect.objectContaining({
          groupName: 'blue',
          cardCount: 1,
        }),
      ])
    );
  });
});

