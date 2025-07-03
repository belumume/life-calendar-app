import { browserDB } from '../browser-db';
import type { User } from '../../validation/schemas';
import { UserSchema } from '../../validation/schemas';
import { BirthDateSchema } from '../../validation/input-schemas';

export class UserRepository {
  async createUser(data: { birthDate: string; passphrase: string }): Promise<User> {
    // Validate birth date first
    const validatedBirthDate = BirthDateSchema.parse(data.birthDate);
    
    const user: User = {
      id: crypto.randomUUID(),
      birthDate: validatedBirthDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate complete user object before saving
    const validated = UserSchema.parse(user);
    await browserDB.saveUser(validated);
    
    return validated;
  }

  async getUser(): Promise<User | null> {
    return await browserDB.getUser();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existing = await this.getUser();
    if (!existing || existing.id !== id) {
      throw new Error('User not found');
    }

    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await browserDB.saveUser(updated);
    return updated;
  }

  async deleteUser(): Promise<void> {
    await browserDB.clear();
  }
}

export const userRepository = new UserRepository();