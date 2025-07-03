import { BaseRepositoryIDB } from './base.repository.idb';
import { User, UserSchema } from '../../validation/schemas';
import { IndexedDatabase } from '../indexed-db';

export class UserRepositoryIDB extends BaseRepositoryIDB<User> {
  constructor(db: IndexedDatabase) {
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

    // Save to IndexedDB
    const db = this.db.getDatabase();
    await db.put('users', {
      id: validated.id,
      birthDate: validated.birthDate,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async findById(id: string): Promise<User | null> {
    const db = this.db.getDatabase();
    const data = await db.get('users', id);
    
    if (!data) return null;
    
    return UserSchema.parse(data);
  }

  async findAll(): Promise<User[]> {
    const db = this.db.getDatabase();
    const all = await db.getAll('users');
    
    return all.map(data => UserSchema.parse(data));
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

    // Update in IndexedDB
    const db = this.db.getDatabase();
    await db.put('users', {
      id: validated.id,
      birthDate: validated.birthDate,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db.getDatabase();
    const existing = await db.get('users', id);
    
    if (!existing) return false;
    
    await db.delete('users', id);
    return true;
  }

  /**
   * Find the first (and should be only) user
   */
  async findFirst(): Promise<User | null> {
    const db = this.db.getDatabase();
    const cursor = await db.transaction('users').store.openCursor();
    
    if (!cursor) return null;
    
    return UserSchema.parse(cursor.value);
  }

  /**
   * Check if any user exists
   */
  async exists(): Promise<boolean> {
    const db = this.db.getDatabase();
    const count = await db.count('users');
    return count > 0;
  }
}