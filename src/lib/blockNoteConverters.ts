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
      const title = getPlainText(block.content as any);
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

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(blockToMarkdown).filter(Boolean).join('\n\n');
}

function blockToMarkdown(block: Block): string {
  const content = getPlainText(block.content as any);

  switch (block.type) {
    case 'heading': {
      const level = (block.props?.level as number) || 1;
      return `${'#'.repeat(level)} ${content}`;
    }

    case 'checkListItem': {
      const checked = block.props?.checked ? 'x' : ' ';
      return `- [${checked}] ${content}`;
    }

    case 'bulletListItem':
      return `- ${content}`;

    case 'numberedListItem':
      return `1. ${content}`;

    case 'paragraph':
      return content;

    default:
      return content;
  }
}

export function updateTaskInBlocks(
  blocks: Block[],
  blockId: string,
  completed: boolean
): Block[] {
  function updateBlock(block: Block): Block {
    if (block.id === blockId && block.type === 'checkListItem') {
      return {
        ...block,
        props: {
          ...block.props,
          checked: completed
        }
      };
    }

    if (block.children && Array.isArray(block.children)) {
      return {
        ...block,
        children: block.children.map(child => updateBlock(child as Block))
      };
    }

    return block;
  }

  return blocks.map(updateBlock);
}
