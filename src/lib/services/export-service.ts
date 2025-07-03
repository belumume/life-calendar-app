import { appService } from './app-service';
import { browserDB } from '../db/browser-db';
import type { User, JournalEntry } from '../validation/schemas';

export interface ExportData {
  version: string;
  exportDate: string;
  user: User | null;
  periods: any[];
  journalEntries: JournalEntry[];
}

export class ExportService {
  async exportToJSON(): Promise<string> {
    try {
      // Get current user
      const user = appService.getCurrentUser();
      if (!user) {
        throw new Error('No user found to export');
      }

      // Get all journal entries (decrypted)
      const journalEntries = await appService.getJournalEntries();

      // Get all periods
      const periods = await this.getAllPeriods(user.id);

      // Create export object
      const exportData: ExportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        user: {
          ...user,
          salt: undefined // Don't export salt for security
        },
        periods,
        journalEntries: journalEntries.map(entry => ({
          ...entry,
          iv: undefined // Don't export encryption artifacts
        }))
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  async exportToMarkdown(): Promise<string> {
    try {
      const user = appService.getCurrentUser();
      if (!user) {
        throw new Error('No user found to export');
      }

      const journalEntries = await appService.getJournalEntries();
      const periods = await this.getAllPeriods(user.id);

      // Build markdown document
      let markdown = `# MyLife Calendar Export\n\n`;
      markdown += `**Export Date:** ${new Date().toLocaleDateString()}\n`;
      markdown += `**Birth Date:** ${new Date(user.birthDate).toLocaleDateString()}\n\n`;

      // Add periods section
      if (periods.length > 0) {
        markdown += `## Periods\n\n`;
        for (const period of periods) {
          markdown += `### ${period.name}\n`;
          markdown += `- Start: ${new Date(period.startDate).toLocaleDateString()}\n`;
          markdown += `- End: ${new Date(period.endDate).toLocaleDateString()}\n`;
          markdown += `- Duration: ${period.totalDays} days\n\n`;
        }
      }

      // Add journal entries
      if (journalEntries.length > 0) {
        markdown += `## Journal Entries\n\n`;
        
        // Sort by date
        const sortedEntries = [...journalEntries].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        for (const entry of sortedEntries) {
          const date = new Date(entry.date);
          markdown += `### ${date.toLocaleDateString()} - Day ${entry.dayNumber || 'N/A'}\n\n`;
          markdown += `${entry.content}\n\n`;
          
          if (entry.mood) {
            markdown += `**Mood:** ${entry.mood}\n\n`;
          }
          
          if (entry.tags && entry.tags.length > 0) {
            markdown += `**Tags:** ${entry.tags.join(', ')}\n\n`;
          }
          
          if (entry.achievements && entry.achievements.length > 0) {
            markdown += `**Achievements:**\n`;
            entry.achievements.forEach(achievement => {
              markdown += `- ${achievement}\n`;
            });
            markdown += '\n';
          }
          
          if (entry.gratitude && entry.gratitude.length > 0) {
            markdown += `**Gratitude:**\n`;
            entry.gratitude.forEach(item => {
              markdown += `- ${item}\n`;
            });
            markdown += '\n';
          }
          
          markdown += '---\n\n';
        }
      }

      return markdown;
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  private async getAllPeriods(userId: string): Promise<any[]> {
    // Since we don't have a direct method in browserDB, we'll get at least the active one
    const activePeriod = await browserDB.getActivePeriod(userId);
    return activePeriod ? [activePeriod] : [];
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async exportAndDownloadJSON(): Promise<void> {
    const jsonContent = await this.exportToJSON();
    const filename = `mylife-calendar-export-${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  async exportAndDownloadMarkdown(): Promise<void> {
    const markdownContent = await this.exportToMarkdown();
    const filename = `mylife-calendar-export-${new Date().toISOString().split('T')[0]}.md`;
    this.downloadFile(markdownContent, filename, 'text/markdown');
  }
}

export const exportService = new ExportService();