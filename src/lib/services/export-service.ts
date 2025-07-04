import { appService } from './app-service';
import { browserDB } from '../db/browser-db';
import type { User, JournalEntry, Goal, Habit } from '../validation/schemas';

export interface ExportData {
  version: string;
  exportDate: string;
  user: User | null;
  periods: any[];
  journalEntries: JournalEntry[];
  goals: Goal[];
  habits: Habit[];
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
      
      // Get all goals
      const goals = await appService.getGoals();
      
      // Get all habits
      const habits = await appService.getHabits();

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
        })),
        goals: goals.map(goal => ({
          ...goal,
          iv: undefined // Remove any encryption artifacts
        })),
        habits: habits.map(habit => ({
          ...habit,
          iv: undefined // Remove any encryption artifacts
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
      const goals = await appService.getGoals();
      const habits = await appService.getHabits();

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
          markdown += `### ${date.toLocaleDateString()} - Day ${entry.dayNumber ?? 'N/A'}\n\n`;
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
      
      // Add goals section
      if (goals.length > 0) {
        markdown += `## Goals\n\n`;
        
        const activeGoals = goals.filter(g => g.status === 'active');
        const completedGoals = goals.filter(g => g.status === 'completed');
        const otherGoals = goals.filter(g => g.status !== 'active' && g.status !== 'completed');
        
        if (activeGoals.length > 0) {
          markdown += `### Active Goals\n\n`;
          for (const goal of activeGoals) {
            markdown += `#### ${goal.title}\n`;
            if (goal.description) markdown += `${goal.description}\n\n`;
            markdown += `- Category: ${goal.category}\n`;
            markdown += `- Priority: ${goal.priority}\n`;
            markdown += `- Progress: ${goal.progress}%\n`;
            if (goal.targetDate) markdown += `- Target Date: ${new Date(goal.targetDate).toLocaleDateString()}\n`;
            
            if (goal.milestones && goal.milestones.length > 0) {
              markdown += `\n**Milestones:**\n`;
              goal.milestones.forEach(m => {
                if (m && m.title) {
                  markdown += `- [${m.completed ? 'x' : ' '}] ${m.title}\n`;
                }
              });
            }
            markdown += '\n';
          }
        }
        
        if (completedGoals.length > 0) {
          markdown += `### Completed Goals\n\n`;
          for (const goal of completedGoals) {
            markdown += `#### ✅ ${goal.title}\n`;
            if (goal.completedAt) {
              markdown += `Completed on: ${new Date(goal.completedAt).toLocaleDateString()}\n`;
            }
            markdown += '\n';
          }
        }
      }
      
      // Add habits section
      if (habits.length > 0) {
        markdown += `## Habits\n\n`;
        
        const dailyHabits = habits.filter(h => h.frequency === 'daily');
        const weeklyHabits = habits.filter(h => h.frequency === 'weekly');
        const monthlyHabits = habits.filter(h => h.frequency === 'monthly');
        
        if (dailyHabits.length > 0) {
          markdown += `### Daily Habits\n\n`;
          for (const habit of dailyHabits) {
            markdown += `#### ${habit.icon || '🎯'} ${habit.name}\n`;
            if (habit.description) markdown += `${habit.description}\n\n`;
            markdown += `- Current Streak: ${habit.currentStreak ?? 0} days\n`;
            markdown += `- Longest Streak: ${habit.longestStreak ?? 0} days\n`;
            markdown += `- Total Completions: ${habit.completions?.length ?? 0}\n`;
            if (habit.targetCount && habit.targetCount > 1) {
              markdown += `- Target: ${habit.targetCount} times daily\n`;
            }
            markdown += '\n';
          }
        }
        
        if (weeklyHabits.length > 0) {
          markdown += `### Weekly Habits\n\n`;
          for (const habit of weeklyHabits) {
            markdown += `#### ${habit.icon || '🎯'} ${habit.name}\n`;
            if (habit.description) markdown += `${habit.description}\n\n`;
            markdown += `- Current Streak: ${habit.currentStreak} weeks\n`;
            markdown += `- Longest Streak: ${habit.longestStreak} weeks\n`;
            markdown += `- Total Completions: ${habit.completions.length}\n`;
            if (habit.targetCount) {
              markdown += `- Target: ${habit.targetCount} times weekly\n`;
            }
            markdown += '\n';
          }
        }
        
        if (monthlyHabits.length > 0) {
          markdown += `### Monthly Habits\n\n`;
          for (const habit of monthlyHabits) {
            markdown += `#### ${habit.icon || '🎯'} ${habit.name}\n`;
            if (habit.description) markdown += `${habit.description}\n\n`;
            markdown += `- Current Streak: ${habit.currentStreak} months\n`;
            markdown += `- Longest Streak: ${habit.longestStreak} months\n`;
            markdown += `- Total Completions: ${habit.completions.length}\n`;
            if (habit.targetCount) {
              markdown += `- Target: ${habit.targetCount} times monthly\n`;
            }
            markdown += '\n';
          }
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