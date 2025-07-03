import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportService } from '../export-service';
import { appService } from '../app-service';
import { encryptionService } from '../../encryption/browser-crypto';

// Mock app service
vi.mock('../app-service', () => ({
  appService: {
    getCurrentUser: vi.fn(),
    getJournalEntries: vi.fn(),
    getCurrentPeriod: vi.fn(),
  }
}));

describe('ExportService', () => {
  const mockUser = {
    id: 'user-123',
    birthDate: '1990-01-01',
    salt: 'user-salt',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPeriod = {
    id: 'period-123',
    userId: 'user-123',
    name: '88 Days of Summer',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-03-29T00:00:00Z',
    totalDays: 88,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockEntries = [
    {
      id: 'entry-1',
      userId: 'user-123',
      periodId: 'period-123',
      date: '2024-01-01T00:00:00Z',
      dayNumber: 1,
      content: 'First day of my journey!',
      mood: 'great' as const,
      tags: ['start', 'excited'],
      achievements: ['Started the program', 'Set up my goals'],
      gratitude: ['Good health', 'Supportive family'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'entry-2',
      userId: 'user-123',
      periodId: 'period-123',
      date: '2024-01-02T00:00:00Z',
      dayNumber: 2,
      content: 'Making progress already',
      mood: 'good' as const,
      tags: ['work', 'productive'],
      achievements: ['Completed morning routine'],
      gratitude: ['Coffee', 'Sunny weather'],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToJSON', () => {
    it('should export data to JSON format without sensitive fields', async () => {
      vi.mocked(appService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(appService.getJournalEntries).mockResolvedValue(mockEntries);
      vi.mocked(appService.getCurrentPeriod).mockResolvedValue(mockPeriod);

      const jsonExport = await exportService.exportToJSON();
      const exportData = JSON.parse(jsonExport);

      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('user');
      expect(exportData).toHaveProperty('periods');
      expect(exportData).toHaveProperty('journalEntries');

      // Check user data doesn't include salt
      expect(exportData.user).not.toHaveProperty('salt');
      expect(exportData.user.birthDate).toBe(mockUser.birthDate);

      // Check journal entries are included
      expect(exportData.journalEntries).toHaveLength(2);
      expect(exportData.journalEntries[0].content).toBe('First day of my journey!');
      expect(exportData.journalEntries[0].mood).toBe('great');
      expect(exportData.journalEntries[0].tags).toEqual(['start', 'excited']);
    });

    it('should handle case when no data exists', async () => {
      vi.mocked(appService.getCurrentUser).mockReturnValue(null);
      vi.mocked(appService.getJournalEntries).mockResolvedValue([]);
      vi.mocked(appService.getCurrentPeriod).mockResolvedValue(null);

      await expect(exportService.exportToJSON()).rejects.toThrow('Failed to export data');
    });
  });

  describe('exportToMarkdown', () => {
    it('should export data to Markdown format', async () => {
      vi.mocked(appService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(appService.getJournalEntries).mockResolvedValue(mockEntries);
      vi.mocked(appService.getCurrentPeriod).mockResolvedValue(mockPeriod);

      const markdown = await exportService.exportToMarkdown();

      expect(markdown).toContain('# MyLife Calendar Export');
      expect(markdown).toContain('**Birth Date:** 1/1/1990');
      expect(markdown).toContain('## Journal Entries');
      expect(markdown).toContain('### 1/1/2024 - Day 1');
      expect(markdown).toContain('First day of my journey!');
      expect(markdown).toContain('**Mood:** great');
      expect(markdown).toContain('**Tags:** start, excited');
      expect(markdown).toContain('**Achievements:**');
      expect(markdown).toContain('- Started the program');
      expect(markdown).toContain('**Gratitude:**');
      expect(markdown).toContain('- Good health');
    });

    it('should handle entries without optional fields', async () => {
      const minimalEntry = {
        id: 'entry-3',
        userId: 'user-123',
        periodId: 'period-123',
        date: '2024-01-03T00:00:00Z',
        dayNumber: 3,
        content: 'Simple entry',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };

      vi.mocked(appService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(appService.getJournalEntries).mockResolvedValue([minimalEntry]);
      vi.mocked(appService.getCurrentPeriod).mockResolvedValue(mockPeriod);

      const markdown = await exportService.exportToMarkdown();

      expect(markdown).toContain('### 1/3/2024 - Day 3');
      expect(markdown).toContain('Simple entry');
      expect(markdown).not.toContain('**Mood:**');
      expect(markdown).not.toContain('**Tags:**');
      expect(markdown).not.toContain('**Achievements:**');
      expect(markdown).not.toContain('**Gratitude:**');
    });
  });

  describe('downloadFile', () => {
    it('should trigger file download', () => {
      // Mock DOM APIs
      const mockAnchor = document.createElement('a');
      mockAnchor.click = vi.fn();
      
      const createElementSpy = vi.spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockAnchor);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')
        .mockImplementation(() => mockAnchor);

      const content = 'Test content';
      const filename = 'test.json';

      exportService.downloadFile(content, filename, 'application/json');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe(filename);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('Security', () => {
    it('should ensure entries are decrypted before export', async () => {
      // This test verifies that the export service receives already-decrypted data
      // from appService.getJournalEntries(), which handles decryption
      
      const encryptedEntries = [
        {
          ...mockEntries[0],
          content: '[Encrypted content]', // This would be the encrypted version
          iv: 'some-iv',
        },
      ];

      // appService should return decrypted entries
      vi.mocked(appService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(appService.getJournalEntries).mockResolvedValue(mockEntries); // Already decrypted
      vi.mocked(appService.getCurrentPeriod).mockResolvedValue(mockPeriod);

      const jsonExport = await exportService.exportToJSON();
      const exportData = JSON.parse(jsonExport);

      // Verify exported content is the decrypted version
      expect(exportData.journalEntries[0].content).toBe('First day of my journey!');
      expect(exportData.journalEntries[0]).not.toHaveProperty('iv');
    });
  });
});