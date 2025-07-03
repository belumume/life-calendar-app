import { BaseRepository } from './base.repository';
import { User, UserSchema } from '../../validation/schemas';
import { AppDatabase } from '../database';

export class UserRepository extends BaseRepository<User> {
  constructor(db: AppDatabase) {
    super(db, 'users');
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const user: User = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Validate data
    const validated = UserSchema.parse(user);

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO users (id, birth_date, created_at, updated_at)
      VALUES (@id, @birthDate, @createdAt, @updatedAt)
    `);

    stmt.run({
      id: validated.id,
      birthDate: validated.birthDate,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async findById(id: string): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT id, birth_date as birthDate, created_at as createdAt, updated_at as updatedAt
      FROM users
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return UserSchema.parse(row);
  }

  async findAll(): Promise<User[]> {
    const stmt = this.db.prepare(`
      SELECT id, birth_date as birthDate, created_at as createdAt, updated_at as updatedAt
      FROM users
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => UserSchema.parse(row));
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      id: existing.id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Ensure creation date cannot be changed
      updatedAt: this.getCurrentTimestamp(),
    };

    // Validate data
    const validated = UserSchema.parse(updated);

    // Update in database
    const stmt = this.db.prepare(`
      UPDATE users
      SET birth_date = @birthDate, updated_at = @updatedAt
      WHERE id = @id
    `);

    stmt.run({
      id: validated.id,
      birthDate: validated.birthDate,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Find the first (and should be only) user
   */
  async findFirst(): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT id, birth_date as birthDate, created_at as createdAt, updated_at as updatedAt
      FROM users
      LIMIT 1
    `);

    const row = stmt.get() as any;
    if (!row) return null;

    return UserSchema.parse(row);
  }

  /**
   * Check if any user exists
   */
  async exists(): Promise<boolean> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get() as { count: number };
    return result.count > 0;
  }
}