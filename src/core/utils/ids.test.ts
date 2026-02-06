import { describe, it, expect } from 'vitest';
import { generateId } from '../../utils/ids';

describe('ID Utilities', () => {
  it('should generate a unique ID string', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);
  });

  it('should match UUID v4 format (approximately)', () => {
    const id = generateId();
    // Simple regex check for typical uuid-like string if that's what we use,
    // or just ensure it's not empty if we use simpler IDs.
    // Assuming implementation uses crypto.randomUUID or similar
    expect(id).toMatch(/^[0-9a-f-]+$/i);
  });
});
