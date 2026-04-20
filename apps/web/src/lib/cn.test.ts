import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges overlapping tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
  it('handles conditionals', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});
