import { describe, it, expect } from 'vitest';
import { detectBlockType, parseMarkdownToBlocks, blocksToMarkdown } from './blockParser';

describe('detectBlockType', () => {
  it('detects heading1', () => {
    expect(detectBlockType('# Title')).toBe('heading1');
  });

  it('detects heading2', () => {
    expect(detectBlockType('## Subtitle')).toBe('heading2');
  });

  it('detects heading3', () => {
    expect(detectBlockType('### Section')).toBe('heading3');
  });

  it('detects task with lowercase x', () => {
    expect(detectBlockType('- [x] Done task')).toBe('task');
  });

  it('detects task with uppercase X', () => {
    expect(detectBlockType('- [X] Done task')).toBe('task');
  });

  it('detects incomplete task', () => {
    expect(detectBlockType('- [ ] Todo task')).toBe('task');
  });

  it('detects bullet list', () => {
    expect(detectBlockType('- List item')).toBe('bulletList');
  });

  it('detects numbered list', () => {
    expect(detectBlockType('1. First item')).toBe('numberedList');
  });

  it('detects code block', () => {
    expect(detectBlockType('```javascript')).toBe('code');
  });

  it('defaults to paragraph', () => {
    expect(detectBlockType('Regular text')).toBe('paragraph');
  });
});

describe('parseMarkdownToBlocks', () => {
  it('parses mixed markdown content', () => {
    const markdown = `# Title
Paragraph text
- [ ] Task item
- List item`;

    const blocks = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe('heading1');
    expect(blocks[0].content).toBe('# Title');
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[1].content).toBe('Paragraph text');
    expect(blocks[2].type).toBe('task');
    expect(blocks[2].content).toBe('- [ ] Task item');
    expect(blocks[2].metadata?.completed).toBe(false);
    expect(blocks[3].type).toBe('bulletList');
    expect(blocks[3].content).toBe('- List item');
  });

  it('parses code blocks', () => {
    const markdown = `\`\`\`javascript
const x = 1;
console.log(x);
\`\`\``;

    const blocks = parseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].content).toBe('const x = 1;\nconsole.log(x);');
    expect(blocks[0].metadata?.language).toBe('javascript');
  });

  it('handles completed tasks', () => {
    const markdown = '- [x] Completed task';
    const blocks = parseMarkdownToBlocks(markdown);

    expect(blocks[0].type).toBe('task');
    expect(blocks[0].metadata?.completed).toBe(true);
  });

  it('returns single empty paragraph for empty string', () => {
    const blocks = parseMarkdownToBlocks('');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].content).toBe('');
  });
});

describe('blocksToMarkdown', () => {
  it('converts blocks back to markdown', () => {
    const blocks = [
      { id: '1', type: 'heading1' as const, content: '# Title' },
      { id: '2', type: 'paragraph' as const, content: 'Text' },
      { id: '3', type: 'task' as const, content: '- [ ] Task', metadata: { completed: false } },
    ];

    const markdown = blocksToMarkdown(blocks);
    expect(markdown).toBe('# Title\nText\n- [ ] Task');
  });

  it('converts code blocks with language', () => {
    const blocks = [
      {
        id: '1',
        type: 'code' as const,
        content: 'const x = 1;',
        metadata: { language: 'javascript' },
      },
    ];

    const markdown = blocksToMarkdown(blocks);
    expect(markdown).toBe('```javascript\nconst x = 1;\n```');
  });
});
