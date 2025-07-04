import { JournalEntry, Goal, Habit, User } from '../types';

export type ConflictResolutionStrategy = 'local-first' | 'remote-first' | 'newest-wins' | 'merge';

export interface ConflictDetail {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  resolution: 'local' | 'remote' | 'merged';
}

export interface ConflictResolution<T> {
  resolved: T;
  strategy: ConflictResolutionStrategy;
  conflicts: ConflictDetail[];
}

export class ConflictResolver {
  constructor(private defaultStrategy: ConflictResolutionStrategy = 'newest-wins') {}

  /**
   * Resolve conflicts between local and remote journal entries
   */
  resolveJournalConflict(
    local: JournalEntry,
    remote: JournalEntry
  ): ConflictResolution<JournalEntry> {
    const conflicts: ConflictResolution<JournalEntry>['conflicts'] = [];
    let resolved: JournalEntry;

    // For journal entries, we typically want to preserve the user's latest thoughts
    if (this.defaultStrategy === 'newest-wins') {
      const localDate = new Date(local.updatedAt);
      const remoteDate = new Date(remote.updatedAt);
      
      if (localDate > remoteDate) {
        resolved = { ...local };
      } else {
        resolved = { ...remote };
      }
    } else if (this.defaultStrategy === 'merge') {
      // For journal entries, merge tags, achievements, and gratitude
      resolved = { ...local };
      
      // Merge arrays by combining unique values
      resolved.tags = [...new Set([...local.tags, ...remote.tags])];
      resolved.achievements = [...new Set([...local.achievements, ...remote.achievements])];
      resolved.gratitude = [...new Set([...local.gratitude, ...remote.gratitude])];
      
      // For content and mood, use newest
      if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        resolved.content = remote.content;
        resolved.iv = remote.iv;
        resolved.mood = remote.mood;
      }
      
      // Track what was merged
      if (local.content !== remote.content) {
        conflicts.push({
          field: 'content',
          localValue: 'encrypted',
          remoteValue: 'encrypted',
          resolution: new Date(local.updatedAt) > new Date(remote.updatedAt) ? 'local' : 'remote'
        });
      }
    } else {
      resolved = this.defaultStrategy === 'local-first' ? { ...local } : { ...remote };
    }

    return {
      resolved,
      strategy: this.defaultStrategy,
      conflicts
    };
  }

  /**
   * Resolve conflicts between local and remote goals
   */
  resolveGoalConflict(
    local: Goal,
    remote: Goal
  ): ConflictResolution<Goal> {
    const conflicts: ConflictResolution<Goal>['conflicts'] = [];
    let resolved: Goal;

    if (this.defaultStrategy === 'newest-wins') {
      const localDate = new Date(local.updatedAt);
      const remoteDate = new Date(remote.updatedAt);
      
      resolved = localDate > remoteDate ? { ...local } : { ...remote };
    } else if (this.defaultStrategy === 'merge') {
      resolved = { ...local };
      
      // For goals, always take the highest progress
      if (remote.progress > local.progress) {
        resolved.progress = remote.progress;
        conflicts.push({
          field: 'progress',
          localValue: local.progress,
          remoteValue: remote.progress,
          resolution: 'remote'
        });
      }
      
      // For status, completed wins over active
      if (remote.status === 'completed' && local.status !== 'completed') {
        resolved.status = 'completed';
        resolved.completedAt = remote.completedAt;
      }
      
      // For milestones, merge completed states
      if (local.milestones && remote.milestones) {
        resolved.milestones = local.milestones.map(localMilestone => {
          const remoteMilestone = remote.milestones?.find(m => m.id === localMilestone.id);
          if (remoteMilestone && remoteMilestone.completed && !localMilestone.completed) {
            return { ...localMilestone, completed: true };
          }
          return localMilestone;
        });
      }
      
      // Use newest for encrypted data
      if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        resolved.encryptedData = remote.encryptedData;
        resolved.iv = remote.iv;
      }
    } else {
      resolved = this.defaultStrategy === 'local-first' ? { ...local } : { ...remote };
    }

    return {
      resolved,
      strategy: this.defaultStrategy,
      conflicts
    };
  }

  /**
   * Resolve conflicts between local and remote habits
   */
  resolveHabitConflict(
    local: Habit,
    remote: Habit
  ): ConflictResolution<Habit> {
    const conflicts: ConflictResolution<Habit>['conflicts'] = [];
    let resolved: Habit;

    if (this.defaultStrategy === 'newest-wins') {
      const localDate = new Date(local.updatedAt);
      const remoteDate = new Date(remote.updatedAt);
      
      resolved = localDate > remoteDate ? { ...local } : { ...remote };
    } else if (this.defaultStrategy === 'merge') {
      resolved = { ...local };
      
      // For habits, merge completions
      const allCompletions = [...(local.completions || []), ...(remote.completions || [])];
      const uniqueCompletions = allCompletions.reduce((acc, completion) => {
        const existing = acc.find(c => c.date === completion.date);
        if (!existing) {
          acc.push(completion);
        } else if (completion.notes && !existing.notes) {
          // If remote has notes and local doesn't, use remote
          existing.notes = completion.notes;
        }
        return acc;
      }, [] as typeof allCompletions);
      
      resolved.completions = uniqueCompletions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Recalculate streaks based on merged completions
      const { currentStreak, longestStreak } = this.calculateStreaks(
        resolved.completions,
        resolved.frequency
      );
      resolved.currentStreak = currentStreak;
      resolved.longestStreak = Math.max(longestStreak, local.longestStreak, remote.longestStreak);
      
      // Use newest for encrypted data
      if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        resolved.encryptedData = remote.encryptedData;
        resolved.iv = remote.iv;
      }
      
      if (local.completions?.length !== resolved.completions.length ||
          remote.completions?.length !== resolved.completions.length) {
        conflicts.push({
          field: 'completions',
          localValue: local.completions?.length || 0,
          remoteValue: remote.completions?.length || 0,
          resolution: 'merged'
        });
      }
    } else {
      resolved = this.defaultStrategy === 'local-first' ? { ...local } : { ...remote };
    }

    return {
      resolved,
      strategy: this.defaultStrategy,
      conflicts
    };
  }

  /**
   * Resolve conflicts between local and remote user data
   */
  resolveUserConflict(
    local: User,
    remote: User
  ): ConflictResolution<User> {
    const conflicts: ConflictResolution<User>['conflicts'] = [];
    let resolved: User;

    // For user data, always use newest to avoid breaking auth
    const localDate = new Date(local.updatedAt);
    const remoteDate = new Date(remote.updatedAt);
    
    resolved = localDate > remoteDate ? { ...local } : { ...remote };
    
    // But preserve local theme if it's newer
    if (local.theme && remote.theme) {
      // If user changed theme locally after remote update, keep local
      if (localDate > remoteDate) {
        resolved.theme = local.theme;
      }
    }

    return {
      resolved,
      strategy: 'newest-wins',
      conflicts
    };
  }

  /**
   * Calculate streaks from completion dates
   */
  private calculateStreaks(
    completions: Array<{ date: string }>,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): { currentStreak: number; longestStreak: number } {
    if (!completions || completions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort completions by date (newest first)
    const sorted = [...completions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if streak is current
    const lastCompletion = new Date(sorted[0].date);
    lastCompletion.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
    
    // For daily habits, must be completed yesterday or today
    if (frequency === 'daily' && daysDiff <= 1) {
      currentStreak = 1;
    } else if (frequency === 'weekly' && daysDiff <= 7) {
      currentStreak = 1;
    } else if (frequency === 'monthly' && daysDiff <= 31) {
      currentStreak = 1;
    }
    
    // Calculate longest streak
    for (let i = 1; i < sorted.length; i++) {
      const current = new Date(sorted[i - 1].date);
      const previous = new Date(sorted[i].date);
      current.setHours(0, 0, 0, 0);
      previous.setHours(0, 0, 0, 0);
      
      const diff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
      
      let isConsecutive = false;
      if (frequency === 'daily') {
        isConsecutive = diff === 1;
      } else if (frequency === 'weekly') {
        isConsecutive = diff <= 7 && diff > 0;
      } else if (frequency === 'monthly') {
        isConsecutive = diff <= 31 && diff > 0;
      }
      
      if (isConsecutive) {
        tempStreak++;
        if (i === 1 && currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    
    return { currentStreak, longestStreak };
  }
}