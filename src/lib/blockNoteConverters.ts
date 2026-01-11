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
