import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userRepository } from '../user-repository';
import { browserDB } from '../../browser-db';
import type { User } from '../../../validation/schemas';

// Mock dependencies
vi.mock('../../browser-db', () => ({
  browserDB: {
    getUser: vi.fn(),
    saveUser: vi.fn(),
    clear: vi.fn(),
  }
}));

describe('UserRepository', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  
  const mockUser: User = {
    id: mockUserId,
    birthDate: '1990-01-01',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    salt: 'user-salt',
    theme: {
      mode: 'light',
      primaryColor: '#007bff',
      accentColor: '#28a745',
      fontSize: 'medium',
      fontFamily: 'system',
      reducedMotion: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('should retrieve the user', async () => {
      vi.mocked(browserDB.getUser).mockResolvedValue(mockUser);

      const result = await userRepository.getUser();

      expect(browserDB.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user exists', async () => {
      vi.mocked(browserDB.getUser).mockResolvedValue(null);

      const result = await userRepository.getUser();

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        birthDate: '1990-01-01',
        passphrase: 'plain-text-passphrase',
      };
      
      vi.mocked(browserDB.saveUser).mockResolvedValue(undefined);

      const result = await userRepository.createUser(userData);

      expect(browserDB.saveUser).toHaveBeenCalled();
      
      const savedUser = vi.mocked(browserDB.saveUser).mock.calls[0][0];
      expect(savedUser).toMatchObject({
        id: expect.any(String),
        birthDate: userData.birthDate,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      
      expect(result.birthDate).toBe(userData.birthDate);
    });

    it('should handle errors during user creation', async () => {
      const error = new Error('Database error');
      vi.mocked(browserDB.saveUser).mockRejectedValue(error);

      await expect(
        userRepository.createUser({ birthDate: '1990-01-01', passphrase: 'test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      vi.mocked(browserDB.getUser).mockResolvedValue(mockUser);
      vi.mocked(browserDB.saveUser).mockResolvedValue(undefined);

      const updates = {
        theme: {
          mode: 'dark' as const,
          primaryColor: '#000000',
          accentColor: '#ffffff',
          fontSize: 'large' as const,
          fontFamily: 'mono' as const,
          reducedMotion: true,
        },
      };

      const result = await userRepository.updateUser(mockUserId, updates);

      expect(browserDB.getUser).toHaveBeenCalled();
      expect(browserDB.saveUser).toHaveBeenCalled();
      
      const savedUser = vi.mocked(browserDB.saveUser).mock.calls[0][0];
      expect(savedUser).toMatchObject({
        ...mockUser,
        ...updates,
        updatedAt: expect.any(String),
      });
      
      expect(result.theme?.mode).toBe('dark');
    });

    it('should update salt when provided', async () => {
      vi.mocked(browserDB.getUser).mockResolvedValue(mockUser);
      vi.mocked(browserDB.saveUser).mockResolvedValue(undefined);

      const newSalt = 'new-salt-value';
      const result = await userRepository.updateUser(mockUserId, { salt: newSalt });

      const savedUser = vi.mocked(browserDB.saveUser).mock.calls[0][0];
      expect(savedUser.salt).toBe(newSalt);
      expect(result.salt).toBe(newSalt);
    });

    it('should throw error when user not found', async () => {
      vi.mocked(browserDB.getUser).mockResolvedValue(null);

      await expect(
        userRepository.updateUser(mockUserId, { salt: 'new-salt' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user by clearing database', async () => {
      vi.mocked(browserDB.clear).mockResolvedValue(undefined);

      await userRepository.deleteUser();

      expect(browserDB.clear).toHaveBeenCalled();
    });
  });
});