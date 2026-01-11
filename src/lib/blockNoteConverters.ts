import type { Block } from '@blocknote/core';

export interface ExtractedTask {
  blockId: string;
  title: string;
  completed: boolean;
  tags: string[];
}

// Helper to extract plain text from inline content
export function getPlainText(content: any[] | undefined): string {
  if (!content) return '';

  return content.map((item: any) => {
    if (item.type === 'text') {
      return item.text || '';
    }
    if (item.type === 'link') {
      // Recursively get text from link content
      return getPlainText(item.content);
    }
    // Future: handle custom tag inline content
    return '';
  }).join('');
}

export function extractTasks(blocks: Block[]): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];

  function traverse(block: Block) {
    // BlockNote uses different block types - check for checkListItem
    if (block.type === 'checkListItem') {
      const title = getPlainText(block.content);
      tasks.push({
        blockId: block.id,
        title,
        completed: (block.props?.checked as boolean) || false,
        tags: [] // Will extract tags later
      });
    }

    // Recursively check children
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(child => traverse(child as Block));
    }
  }

  blocks.forEach(traverse);
  return tasks;
}
