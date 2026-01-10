import { describe, it, expect } from 'vitest';
import { parseContent } from './parser';

describe('Content Parser', () => {
  it('should extract title from first heading', () => {
    const content = '# My Note\nContent here';
    const result = parseContent(content);
    expect(result.title).toBe('My Note');
  });

  it('should extract title from first line if no heading', () => {
    const content = 'This is my note\nMore content';
    const result = parseContent(content);
    expect(result.title).toBe('This is my note');
  });

  it('should truncate long titles', () => {
    const content = 'a'.repeat(600);
    const result = parseContent(content);
    expect(result.title.length).toBeLessThanOrEqual(500);
  });

  it('should extract hashtags', () => {
    const content = 'Note with #work and #urgent tags';
    const result = parseContent(content);
    expect(result.tags).toEqual(['work', 'urgent']);
  });

  it('should deduplicate hashtags', () => {
    const content = '#work is #work and #work again';
    const result = parseContent(content);
    expect(result.tags).toEqual(['work']);
  });

  it('should extract unchecked tasks', () => {
    const content = '[ ] Do something #work\n[ ] Another task';
    const result = parseContent(content);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].title).toBe('Do something #work');
    expect(result.tasks[0].completed).toBe(false);
    expect(result.tasks[0].tags).toEqual(['work']);
  });

  it('should extract checked tasks', () => {
    const content = '[x] Done task\n[X] Also done';
    const result = parseContent(content);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].completed).toBe(true);
    expect(result.tasks[1].completed).toBe(true);
  });

  it('should extract task line numbers', () => {
    const content = 'Line 1\nLine 2\n[ ] Task on line 3\nLine 4';
    const result = parseContent(content);
    expect(result.tasks[0].lineNumber).toBe(2); // 0-indexed
  });

  it('should handle tasks with indentation', () => {
    const content = '  [ ] Indented task\n\t[ ] Tab indented';
    const result = parseContent(content);
    expect(result.tasks).toHaveLength(2);
  });
});
