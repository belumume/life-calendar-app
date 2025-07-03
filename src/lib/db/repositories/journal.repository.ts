import { BaseRepository } from './base.repository';
import { JournalEntry, JournalEntrySchema } from '../../validation/schemas';
import { AppDatabase } from '../database';

interface JournalEntryRow {
  id: string;
  user_id: string;
  period_id: string | null;
  date: string;
  day_number: number | null;
  encrypted_content: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

export class JournalRepository extends BaseRepository<JournalEntry> {
  constructor(db: AppDatabase) {
    super(db, 'journal_entries');
  }

  async create(data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const entry: JournalEntry = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Validate data
    const validated = JournalEntrySchema.parse(entry);

    // Encrypt sensitive content
    const sensitiveData = {
      content: validated.content,
      mood: validated.mood,
      tags: validated.tags,
      achievements: validated.achievements,
      gratitude: validated.gratitude,
    };

    const { encrypted, iv } = await this.encryptData(sensitiveData);

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO journal_entries (
        id, user_id, period_id, date, day_number, 
        encrypted_content, iv, created_at, updated_at
      )
      VALUES (
        @id, @userId, @periodId, @date, @dayNumber, 
        @encryptedContent, @iv, @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: validated.id,
      userId: validated.userId,
      periodId: validated.periodId || null,
      date: validated.date,
      dayNumber: validated.dayNumber || null,
      encryptedContent: encrypted,
      iv: iv,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async findById(id: string): Promise<JournalEntry | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries WHERE id = ?
    `);

    const row = stmt.get(id) as JournalEntryRow | undefined;
    if (!row) return null;

    return this.rowToEntry(row);
  }

  async findAll(): Promise<JournalEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all() as JournalEntryRow[];
    return Promise.all(rows.map(row => this.rowToEntry(row)));
  }

  async findByUserId(userId: string): Promise<JournalEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all(userId) as JournalEntryRow[];
    return Promise.all(rows.map(row => this.rowToEntry(row)));
  }

  async findByPeriodId(periodId: string): Promise<JournalEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries
      WHERE period_id = ?
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all(periodId) as JournalEntryRow[];
    return Promise.all(rows.map(row => this.rowToEntry(row)));
  }

  async findByDate(userId: string, date: string): Promise<JournalEntry | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries
      WHERE user_id = ? AND date(date) = date(?)
      LIMIT 1
    `);

    const row = stmt.get(userId, date) as JournalEntryRow | undefined;
    if (!row) return null;

    return this.rowToEntry(row);
  }

  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<JournalEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries
      WHERE user_id = ? AND date(date) BETWEEN date(?) AND date(?)
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all(userId, startDate, endDate) as JournalEntryRow[];
    return Promise.all(rows.map(row => this.rowToEntry(row)));
  }

  async update(id: string, data: Partial<JournalEntry>): Promise<JournalEntry | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      id: existing.id,
      userId: existing.userId, // Cannot change user
      createdAt: existing.createdAt,
      updatedAt: this.getCurrentTimestamp(),
    };

    // Validate data
    const validated = JournalEntrySchema.parse(updated);

    // Encrypt sensitive content
    const sensitiveData = {
      content: validated.content,
      mood: validated.mood,
      tags: validated.tags,
      achievements: validated.achievements,
      gratitude: validated.gratitude,
    };

    const { encrypted, iv } = await this.encryptData(sensitiveData);

    // Update in database
    const stmt = this.db.prepare(`
      UPDATE journal_entries
      SET 
        period_id = @periodId,
        date = @date,
        day_number = @dayNumber,
        encrypted_content = @encryptedContent,
        iv = @iv,
        updated_at = @updatedAt
      WHERE id = @id
    `);

    stmt.run({
      id: validated.id,
      periodId: validated.periodId || null,
      date: validated.date,
      dayNumber: validated.dayNumber || null,
      encryptedContent: encrypted,
      iv: iv,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM journal_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Convert database row to JournalEntry
   */
  private async rowToEntry(row: JournalEntryRow): Promise<JournalEntry> {
    // Decrypt sensitive content
    const decrypted = await this.decryptData(row.encrypted_content, row.iv);

    const entry: JournalEntry = {
      id: row.id,
      userId: row.user_id,
      periodId: row.period_id || undefined,
      date: row.date,
      dayNumber: row.day_number || undefined,
      content: decrypted.content,
      mood: decrypted.mood,
      tags: decrypted.tags,
      achievements: decrypted.achievements,
      gratitude: decrypted.gratitude,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return JournalEntrySchema.parse(entry);
  }

  /**
   * Get entry count for a user
   */
  async getCount(userId: string): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?');
    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  /**
   * Get recent entries for a user
   */
  async getRecent(userId: string, limit: number = 10): Promise<JournalEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM journal_entries
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit) as JournalEntryRow[];
    return Promise.all(rows.map(row => this.rowToEntry(row)));
  }
}