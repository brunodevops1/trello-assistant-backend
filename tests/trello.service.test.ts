/**
 * Tests unitaires pour TrelloService
 * 
 * Note: Ces tests nécessitent des variables d'environnement configurées
 * et peuvent faire des appels réels à l'API Trello.
 * Pour des tests complets, utilisez des mocks (ex: nock, jest.mock).
 */

import { TrelloService } from '../src/services/trello.service';
import {
  TaskNotFoundError,
  MultipleTasksFoundError,
  BoardNotFoundError,
} from '../src/utils/errors';

describe('TrelloService', () => {
  let service: TrelloService;

  beforeAll(() => {
    // Vérifier que les variables d'environnement sont définies et valides
    if (
      !process.env.TRELLO_API_KEY ||
      !process.env.TRELLO_API_TOKEN ||
      !process.env.TRELLO_DEFAULT_BOARD_ID ||
      process.env.TRELLO_API_KEY === 'your_trello_api_key' ||
      process.env.TRELLO_API_TOKEN === 'your_trello_api_token' ||
      process.env.TRELLO_DEFAULT_BOARD_ID === 'your_default_board_id'
    ) {
      console.warn(
        '⚠️  Variables d\'environnement Trello non configurées ou invalides. Les tests seront ignorés.'
      );
      console.warn(
        '💡 Configurez TRELLO_API_KEY, TRELLO_API_TOKEN et TRELLO_DEFAULT_BOARD_ID dans .env pour exécuter les tests d\'intégration.'
      );
      return;
    }

    service = new TrelloService();
  });

  describe('createTask', () => {
    it('devrait créer une tâche avec tous les paramètres', async () => {
      if (!service) return;

      const result = await service.createTask({
        title: 'Test Task ' + Date.now(),
        list: 'Nouvelles taches',
        due_date: '2026-12-31T00:00:00Z',
      });

      expect(result).toBeDefined();
      expect(result.name).toContain('Test Task');
    }, 10000);

    it('devrait créer une tâche avec seulement le titre', async () => {
      if (!service) return;

      const result = await service.createTask({
        title: 'Test Task Simple ' + Date.now(),
        list: 'Nouvelles taches',
      });

      expect(result).toBeDefined();
      expect(result.name).toContain('Test Task Simple');
    }, 10000);
  });

  describe('completeTask', () => {
    it('devrait marquer une tâche comme terminée', async () => {
      if (!service) return;

      // Créer d'abord une tâche
      const task = await service.createTask({
        title: 'Task to Complete ' + Date.now(),
      });

      // La marquer comme terminée
      const result = await service.completeTask({
        task_name: task.name,
      });

      expect(result).toBeDefined();
      expect(result.dueComplete).toBe(true);
    }, 15000);

    it('devrait lever une erreur si la tâche n\'existe pas', async () => {
      if (!service) return;

      await expect(
        service.completeTask({
          task_name: 'Tâche qui n\'existe pas ' + Date.now(),
        })
      ).rejects.toThrow(TaskNotFoundError);
    }, 10000);
  });

  describe('updateDueDate', () => {
    it('devrait mettre à jour la date d\'échéance', async () => {
      if (!service) return;

      // Créer d'abord une tâche
      const task = await service.createTask({
        title: 'Task to Update ' + Date.now(),
      });

      // Mettre à jour la date
      const newDate = '2026-06-15T00:00:00Z';
      const result = await service.updateDueDate({
        task_name: task.name,
        due_date: newDate,
      });

      expect(result).toBeDefined();
      expect(result.due).toBe(newDate);
    }, 15000);

    it('devrait lever une erreur si la tâche n\'existe pas', async () => {
      if (!service) return;

      await expect(
        service.updateDueDate({
          task_name: 'Tâche inexistante ' + Date.now(),
          due_date: '2026-12-31T00:00:00Z',
        })
      ).rejects.toThrow(TaskNotFoundError);
    }, 10000);
  });
});

