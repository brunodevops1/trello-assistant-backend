import axios from 'axios';
import { TrelloService } from '../src/services/trello.service';

jest.mock('axios');

describe('TrelloService - shiftDueDates', () => {
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

  it('décale les échéances des cartes ayant une due date', async () => {
    const oldDueOne = '2025-01-01T09:00:00.000Z';
    const oldDueTwo = '2025-01-05T18:30:00.000Z';
    const expectedNewDueOne = new Date(
      new Date(oldDueOne).getTime() + 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    const expectedNewDueTwo = new Date(
      new Date(oldDueTwo).getTime() + 2 * 24 * 60 * 60 * 1000
    ).toISOString();

    mockGet.mockImplementation((url: string) => {
      if (url === '/members/me/boards') {
        return Promise.resolve({
          data: [{ id: 'board123', name: 'Organisation' }],
        });
      }

      if (url === '/boards/board123/lists') {
        return Promise.resolve({
          data: [
            { id: 'listABC', name: 'À faire' },
            { id: 'listDEF', name: 'En cours' },
          ],
        });
      }

      if (url === '/lists/listABC/cards') {
        return Promise.resolve({
          data: [
            { id: 'card1', name: 'Carte 1', due: oldDueOne },
            { id: 'card2', name: 'Carte 2', due: oldDueTwo },
            { id: 'card3', name: 'Carte 3', due: null },
          ],
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    mockPut.mockResolvedValue({ data: {} });

    const service = new TrelloService();
    const shifted = await service.shiftDueDates({
      listName: 'À faire',
      days: 2,
    });

    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenNthCalledWith(1, '/cards/card1', {
      due: expectedNewDueOne,
    });
    expect(mockPut).toHaveBeenNthCalledWith(2, '/cards/card2', {
      due: expectedNewDueTwo,
    });
    expect(shifted).toEqual([
      {
        cardName: 'Carte 1',
        oldDue: oldDueOne,
        newDue: expectedNewDueOne,
      },
      {
        cardName: 'Carte 2',
        oldDue: oldDueTwo,
        newDue: expectedNewDueTwo,
      },
    ]);
  });
});

