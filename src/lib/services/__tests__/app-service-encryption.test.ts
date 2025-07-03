import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appService } from '../app-service';
import { encryptionService } from '../../encryption/browser-crypto';
import { browserDB } from '../../db/browser-db';
import { userRepository } from '../../db/repositories/user-repository';
import { journalRepository } from '../../db/repositories/journal-repository';

// Mock dependencies
vi.mock('../../db/browser-db', () => ({
  browserDB: {
    init: vi.fn(),
    savePeriod: vi.fn(),
    getActivePeriod: vi.fn(),
    clear: vi.fn(),
  }
}));

vi.mock('../../db/repositories/user-repository', () => ({
  userRepository: {
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  }
}));

vi.mock('../../db/repositories/journal-repository', () => ({
  journalRepository: {
    createEntry: vi.fn(),
    getEntriesByUser: vi.fn(),
  }
}));

describe('AppService Encryption Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset app service state
    (appService as any).currentUser = null;
    (appService as any).isInitialized = false;
    (appService as any).authenticated = false;
    encryptionService.clear();
  });

  describe('createAccount', () => {
    it('should create account with encrypted data and salt', async () => {
      const birthDate = '1990-01-01';
      const passphrase = 'strong-passphrase-123';
      const mockUser = {
        id: 'user-123',
        birthDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(browserDB.init).mockResolvedValue();
      vi.mocked(userRepository.getUser).mockResolvedValue(null);
      vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);
      vi.mocked(userRepository.updateUser).mockResolvedValue({
        ...mockUser,
        salt: 'generated-salt',
      });
      vi.mocked(browserDB.savePeriod).mockResolvedValue();

      await appService.initialize();
      const user = await appService.createAccount(birthDate, passphrase);

      expect(user).toBeDefined();
      expect(user.salt).toBeTruthy();
      expect(userRepository.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ salt: expect.any(String) })
      );
      expect(encryptionService.isInitialized()).toBe(true);
    });
  });

  describe('login', () => {
    it('should login with correct passphrase and decrypt entries', async () => {
      const passphrase = 'correct-passphrase';
      const salt = 'user-salt';
      const mockUser = {
        id: 'user-123',
        birthDate: '1990-01-01',
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Simulate encrypted entry
      await encryptionService.initialize(passphrase, salt);
      const encrypted = await encryptionService.encrypt('Test journal entry');
      
      vi.mocked(browserDB.init).mockResolvedValue();
      vi.mocked(userRepository.getUser).mockResolvedValue(mockUser);
      vi.mocked(journalRepository.getEntriesByUser).mockResolvedValue([
        {
          id: 'entry-1',
          userId: mockUser.id,
          periodId: 'period-1',
          date: new Date().toISOString(),
          dayNumber: 1,
          content: encrypted.encrypted,
          iv: encrypted.iv,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await appService.initialize();
      const success = await appService.login(passphrase);

      expect(success).toBe(true);
      expect(appService.isAuthenticated()).toBe(true);
    });

    it('should fail login with incorrect passphrase', async () => {
      const correctPassphrase = 'correct-passphrase';
      const wrongPassphrase = 'wrong-passphrase';
      const salt = 'user-salt';
      const mockUser = {
        id: 'user-123',
        birthDate: '1990-01-01',
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Encrypt with correct passphrase
      await encryptionService.initialize(correctPassphrase, salt);
      const encrypted = await encryptionService.encrypt('Test journal entry');
      encryptionService.clear();

      vi.mocked(browserDB.init).mockResolvedValue();
      vi.mocked(userRepository.getUser).mockResolvedValue(mockUser);
      vi.mocked(journalRepository.getEntriesByUser).mockResolvedValue([
        {
          id: 'entry-1',
          userId: mockUser.id,
          periodId: 'period-1',
          date: new Date().toISOString(),
          dayNumber: 1,
          content: encrypted.encrypted,
          iv: encrypted.iv,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await appService.initialize();
      const success = await appService.login(wrongPassphrase);

      expect(success).toBe(false);
      expect(appService.isAuthenticated()).toBe(false);
    });
  });

  describe('addJournalEntry', () => {
    it('should encrypt journal entries before saving', async () => {
      const passphrase = 'test-passphrase';
      const salt = 'user-salt';
      const mockUser = {
        id: 'user-123',
        birthDate: '1990-01-01',
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockPeriod = {
        id: 'period-123',
        userId: mockUser.id,
        name: 'Test Period',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        totalDays: 88,
        isActive: true,
      };

      vi.mocked(browserDB.init).mockResolvedValue();
      vi.mocked(userRepository.getUser).mockResolvedValue(mockUser);
      vi.mocked(browserDB.getActivePeriod).mockResolvedValue(mockPeriod);
      vi.mocked(journalRepository.createEntry).mockImplementation(async (data) => ({
        ...data,
        id: 'entry-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await appService.initialize();
      (appService as any).currentUser = mockUser;
      (appService as any).authenticated = true;
      await encryptionService.initialize(passphrase, salt);

      const content = 'My journal entry for today';
      const entry = await appService.addJournalEntry(
        content,
        1,
        'good',
        ['work', 'exercise'],
        ['Completed project'],
        ['Family time']
      );

      expect(journalRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          periodId: mockPeriod.id,
          dayNumber: 1,
          content: expect.not.stringContaining(content), // Should be encrypted
          iv: expect.any(String),
          mood: 'good',
          tags: ['work', 'exercise'],
          achievements: ['Completed project'],
          gratitude: ['Family time'],
        })
      );

      // Verify the content was actually encrypted
      const createCall = vi.mocked(journalRepository.createEntry).mock.calls[0][0];
      const decrypted = await encryptionService.decrypt({
        encrypted: createCall.content,
        iv: createCall.iv!,
      });
      expect(decrypted).toBe(content);
    });
  });

  describe('getJournalEntries', () => {
    it('should decrypt journal entries when fetching', async () => {
      const passphrase = 'test-passphrase';
      const salt = 'user-salt';
      const mockUser = {
        id: 'user-123',
        birthDate: '1990-01-01',
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await encryptionService.initialize(passphrase, salt);
      const content1 = 'First journal entry';
      const content2 = 'Second journal entry';
      const encrypted1 = await encryptionService.encrypt(content1);
      const encrypted2 = await encryptionService.encrypt(content2);

      vi.mocked(browserDB.init).mockResolvedValue();
      vi.mocked(userRepository.getUser).mockResolvedValue(mockUser);
      vi.mocked(journalRepository.getEntriesByUser).mockResolvedValue([
        {
          id: 'entry-1',
          userId: mockUser.id,
          periodId: 'period-1',
          date: new Date().toISOString(),
          dayNumber: 1,
          content: encrypted1.encrypted,
          iv: encrypted1.iv,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'entry-2',
          userId: mockUser.id,
          periodId: 'period-1',
          date: new Date().toISOString(),
          dayNumber: 2,
          content: encrypted2.encrypted,
          iv: encrypted2.iv,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await appService.initialize();
      (appService as any).currentUser = mockUser;
      (appService as any).authenticated = true;

      const entries = await appService.getJournalEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].content).toBe(content1);
      expect(entries[1].content).toBe(content2);
    });

    it('should show placeholder text when not authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        birthDate: '1990-01-01',
        salt: 'user-salt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(browserDB.init).mockResolvedValue();
      vi.mocked(userRepository.getUser).mockResolvedValue(mockUser);
      vi.mocked(journalRepository.getEntriesByUser).mockResolvedValue([
        {
          id: 'entry-1',
          userId: mockUser.id,
          periodId: 'period-1',
          date: new Date().toISOString(),
          dayNumber: 1,
          content: 'encrypted-content',
          iv: 'some-iv',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await appService.initialize();
      (appService as any).currentUser = mockUser;
      // Not authenticated - encryption not initialized

      const entries = await appService.getJournalEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].content).toBe('[Please log in to view]');
    });
  });
});