import type { Block, BlockType } from './blockTypes';

export function detectBlockType(content: string): BlockType {
  const trimmed = content.trim();

  if (trimmed.startsWith('# ')) return 'heading1';
  if (trimmed.startsWith('## ')) return 'heading2';
  if (trimmed.startsWith('### ')) return 'heading3';
  if (trimmed.match(/^- \[(x| )\]/i)) return 'task';
  if (trimmed.startsWith('- ')) return 'bulletList';
  if (trimmed.match(/^\d+\. /)) return 'numberedList';
  if (trimmed.startsWith('```')) return 'code';

  return 'paragraph';
}

export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let currentCodeBlock: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true;
        codeLanguage = line.trim().substring(3);
        currentCodeBlock = [];
      } else {
        // Ending a code block
        blocks.push({
          id: `block-${Date.now()}-${i}`,
          type: 'code',
          content: currentCodeBlock.join('\n'),
          metadata: { language: codeLanguage },
        });
        inCodeBlock = false;
        currentCodeBlock = [];
        codeLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeBlock.push(line);
      continue;
    }

    // Regular blocks
    if (line.trim() === '') {
      // Empty lines create paragraph blocks
      blocks.push({
        id: `block-${Date.now()}-${i}`,
        type: 'paragraph',
        content: '',
      });
    } else {
      const type = detectBlockType(line);
      const block: Block = {
        id: `block-${Date.now()}-${i}`,
        type,
        content: line,
      };

      // Add task metadata
      if (type === 'task') {
        const isCompleted = line.match(/^- \[x\]/i);
        block.metadata = { completed: !!isCompleted };
      }

      blocks.push(block);
    }
  }

  // Handle unclosed code block
  if (inCodeBlock) {
    blocks.push({
      id: `block-${Date.now()}-${lines.length}`,
      type: 'code',
      content: currentCodeBlock.join('\n'),
      metadata: { language: codeLanguage },
    });
  }

  return blocks.length > 0 ? blocks : [{ id: 'block-initial', type: 'paragraph', content: '' }];
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'code') {
        const lang = block.metadata?.language || '';
        return `\`\`\`${lang}\n${block.content}\n\`\`\``;
      }
      return block.content;
    })
    .join('\n');
}
