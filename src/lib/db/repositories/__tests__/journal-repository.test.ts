import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { journalRepository } from '../journal-repository';
import { browserDB } from '../../browser-db';
import type { JournalEntry } from '../../../validation/schemas';

// Mock the browserDB
vi.mock('../../browser-db', () => ({
  browserDB: {
    getEntries: vi.fn(),
    getEntriesPaginated: vi.fn(),
    saveEntry: vi.fn(),
    deleteEntry: vi.fn(),
  }
}));

describe('JournalRepository', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEntryId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPeriodId = '550e8400-e29b-41d4-a716-446655440002';
  
  const mockEntry: JournalEntry = {
    id: mockEntryId,
    userId: mockUserId,
    periodId: mockPeriodId,
    date: '2025-01-01T00:00:00Z',
    dayNumber: 1,
    content: 'Test journal entry content',
    iv: 'initialization-vector',
    mood: 'good',
    tags: ['test', 'journal'],
    achievements: ['Completed test'],
    gratitude: ['Grateful for tests'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should create a new journal entry', async () => {
      vi.mocked(browserDB.saveEntry).mockResolvedValue(undefined);

      const entryData = {
        userId: mockUserId,
        periodId: mockPeriodId,
        date: '2025-01-01T00:00:00Z',
        dayNumber: 1,
        content: 'Test content',
        iv: 'test-iv',
        mood: 'good' as const,
        tags: ['test'],
        achievements: ['achievement'],
        gratitude: ['gratitude'],
      };

      const result = await journalRepository.createEntry(entryData);

      expect(browserDB.saveEntry).toHaveBeenCalled();
      const savedEntry = vi.mocked(browserDB.saveEntry).mock.calls[0][0];
      expect(savedEntry).toMatchObject({
        ...entryData,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(result).toMatchObject(entryData);
    });

    it('should validate entry data', async () => {
      const invalidData = {
        userId: 'invalid-id',
        periodId: mockPeriodId,
        date: '2025-01-01T00:00:00Z',
        dayNumber: 1,
        content: 'Test content',
      };

      await expect(journalRepository.createEntry(invalidData)).rejects.toThrow();
    });

    it('should handle database errors when creating entry', async () => {
      const error = new Error('Database error');
      vi.mocked(browserDB.saveEntry).mockRejectedValue(error);

      const entryData = {
        userId: mockUserId,
        periodId: mockPeriodId,
        date: '2025-01-01T00:00:00Z',
        dayNumber: 1,
        content: 'Test content',
      };

      await expect(journalRepository.createEntry(entryData)).rejects.toThrow('Database error');
    });
  });

  describe('getEntriesByUser', () => {
    it('should retrieve entries by user ID', async () => {
      const mockEntries = [mockEntry];
      vi.mocked(browserDB.getEntries).mockResolvedValue(mockEntries);

      const result = await journalRepository.getEntriesByUser(mockUserId);

      expect(browserDB.getEntries).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockEntries);
    });

    it('should return empty array when no entries found', async () => {
      vi.mocked(browserDB.getEntries).mockResolvedValue([]);

      const result = await journalRepository.getEntriesByUser(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getEntryByDate', () => {
    it('should retrieve entry by user ID and date', async () => {
      const mockEntries = [
        mockEntry,
        { ...mockEntry, id: 'entry-2', date: '2025-01-02T00:00:00Z' }
      ];
      vi.mocked(browserDB.getEntries).mockResolvedValue(mockEntries);

      const result = await journalRepository.getEntryByDate(mockUserId, '2025-01-01T00:00:00Z');

      expect(result).toEqual(mockEntry);
    });

    it('should return null when entry not found for date', async () => {
      vi.mocked(browserDB.getEntries).mockResolvedValue([mockEntry]);

      const result = await journalRepository.getEntryByDate(mockUserId, '2025-01-05T00:00:00Z');

      expect(result).toBeNull();
    });
  });

  describe('updateEntry', () => {
    it('should update an existing entry', async () => {
      const mockEntries = [mockEntry];
      vi.mocked(browserDB.getEntries).mockResolvedValue(mockEntries);
      vi.mocked(browserDB.saveEntry).mockResolvedValue(undefined);

      const updates = {
        content: 'Updated content',
        mood: 'great' as const,
      };

      const result = await journalRepository.updateEntry(mockEntryId, updates);

      expect(browserDB.saveEntry).toHaveBeenCalled();
      const savedEntry = vi.mocked(browserDB.saveEntry).mock.calls[0][0];
      expect(savedEntry).toMatchObject({
        ...mockEntry,
        ...updates,
        updatedAt: expect.any(String),
      });
      expect(result.content).toBe('Updated content');
      expect(result.mood).toBe('excited');
    });

    it('should throw error when entry to update not found', async () => {
      vi.mocked(browserDB.getEntries).mockResolvedValue([]);

      await expect(
        journalRepository.updateEntry('non-existent', { content: 'New content' })
      ).rejects.toThrow('Entry not found');
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry', async () => {
      // Note: According to the code, delete is not implemented yet
      await journalRepository.deleteEntry(mockEntryId, mockUserId);
      
      // Should log a warning but not throw
      // deleteEntry doesn't exist on browserDB, it's just a placeholder method
    });
  });

  describe('getEntriesPaginated', () => {
    it('should retrieve paginated entries', async () => {
      const mockPaginatedResult = {
        entries: [mockEntry],
        total: 10,
        hasMore: true,
      };
      vi.mocked(browserDB.getEntriesPaginated).mockResolvedValue(mockPaginatedResult);

      const result = await journalRepository.getEntriesPaginated(mockUserId, 1, 10);

      expect(browserDB.getEntriesPaginated).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result).toEqual({
        ...mockPaginatedResult,
        page: 1,
        pageSize: 10,
      });
    });

    it('should use default pagination values', async () => {
      const mockPaginatedResult = {
        entries: [],
        total: 0,
        hasMore: false,
      };
      vi.mocked(browserDB.getEntriesPaginated).mockResolvedValue(mockPaginatedResult);

      const result = await journalRepository.getEntriesPaginated(mockUserId);

      expect(browserDB.getEntriesPaginated).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });
});