import { describe, it, expect } from 'vitest';
import { loginSchema, createUserSchema, submitCheckInSchema } from '@ait/validation';

describe('Validation Schema Tests', () => {
  describe('loginSchema', () => {
    it('should validate correct login inputs', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'AdminPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty fields', () => {
      const result1 = loginSchema.safeParse({ username: '', password: '123' });
      expect(result1.success).toBe(false);

      const result2 = loginSchema.safeParse({ username: 'user', password: '' });
      expect(result2.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate proper user info', () => {
      const result = createUserSchema.safeParse({
        username: 'john_doe',
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'member',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid usernames', () => {
      const result = createUserSchema.safeParse({
        username: 'jo', // too short
        fullName: 'John Doe',
        role: 'member',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('submitCheckInSchema', () => {
    const mockTaskId = '11111111-2222-3333-4444-555555555555';

    it('should accept when there are items', () => {
      const result = submitCheckInSchema.safeParse({
        items: [
          {
            taskId: mockTaskId,
            workDone: 'Fixed critical bugs on the login screen',
            percentCompleteProposed: 80,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept when there is no activity reason', () => {
      const result = submitCheckInSchema.safeParse({
        noActivityReason: 'Sick leave today',
        items: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject when both items and reason are empty', () => {
      const result = submitCheckInSchema.safeParse({
        items: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
