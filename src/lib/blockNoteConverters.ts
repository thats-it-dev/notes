import type { Block } from '@blocknote/core';

export interface ExtractedTask {
  blockId: string;
  title: string;
  displayTitle: string; // Title without due date syntax
  completed: boolean;
  tags: string[];
  dueDate?: Date;
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
      const { dueDate, displayTitle } = parseDueDate(title);
      tasks.push({
        blockId: block.id,
        title,
        displayTitle,
        completed: (block.props?.checked as boolean) || false,
        tags: [], // Will extract tags later
        dueDate,
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

/**
 * Parse due date from task text using due:<target> syntax.
 * Supports formats:
 * - due:today, due:tomorrow
 * - due:+N (N days from now)
 * - due:monday, due:tuesday, etc (next occurrence)
 * - due:next-week, due:next-month
 * - due:4/15, due:12/25 (M/D)
 * - due:2026-04-15 (ISO)
 * - due:"next week" (quoted phrases)
 * Returns the due date and the text with the due date syntax removed.
 */
export function parseDueDate(text: string): { dueDate: Date | undefined; displayTitle: string } {
  // Extract due:"quoted phrase" or due:single-word (with hyphens, plus, slash)
  const quotedDueMatch = text.match(/due:"([^"]+)"/i);
  const wordDueMatch = text.match(/due:([\w+\-/]+)/i);

  let dueDate: Date | undefined;
  let displayTitle = text;

  if (quotedDueMatch) {
    dueDate = parseDueDateValue(quotedDueMatch[1]) ?? undefined;
    displayTitle = text.replace(/due:"[^"]+"/i, '').replace(/\s+/g, ' ').trim();
  } else if (wordDueMatch) {
    dueDate = parseDueDateValue(wordDueMatch[1]) ?? undefined;
    displayTitle = text.replace(/due:[\w+\-/]+/i, '').replace(/\s+/g, ' ').trim();
  } else {
    displayTitle = text.trim();
  }

  return { dueDate, displayTitle };
}

/**
 * Parse the due date value from various formats.
 */
function parseDueDateValue(input: string): Date | null {
  const normalized = input.toLowerCase().replace(/\s+/g, '-');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Relative dates
  if (normalized === 'today') {
    return today;
  }
  if (normalized === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // +N format (e.g., +3 for 3 days from now)
  const plusMatch = normalized.match(/^\+(\d+)$/);
  if (plusMatch) {
    const result = new Date(today);
    result.setDate(result.getDate() + parseInt(plusMatch[1], 10));
    return result;
  }

  // next-week (next Monday)
  if (normalized === 'next-week') {
    const result = new Date(today);
    const currentDay = result.getDay();
    const daysUntilMonday = (1 - currentDay + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntilMonday);
    return result;
  }

  // next-month (1st of next month)
  if (normalized === 'next-month') {
    const result = new Date(today);
    result.setMonth(result.getMonth() + 1);
    result.setDate(1);
    return result;
  }

  // in-N-days, in-N-weeks
  const inDaysMatch = normalized.match(/^in-(\d+)-days?$/);
  if (inDaysMatch) {
    const result = new Date(today);
    result.setDate(result.getDate() + parseInt(inDaysMatch[1], 10));
    return result;
  }
  const inWeeksMatch = normalized.match(/^in-(\d+)-weeks?$/);
  if (inWeeksMatch) {
    const result = new Date(today);
    result.setDate(result.getDate() + parseInt(inWeeksMatch[1], 10) * 7);
    return result;
  }

  // Weekday names (next occurrence)
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = weekdays.indexOf(normalized);
  if (dayIndex !== -1) {
    const result = new Date(today);
    const currentDay = result.getDay();
    const daysUntil = (dayIndex - currentDay + 7) % 7 || 7; // next occurrence
    result.setDate(result.getDate() + daysUntil);
    return result;
  }

  // Try ISO format (YYYY-MM-DD)
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const result = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(result.getTime())) {
      return result;
    }
  }

  // Try M/D format (assume current or next year)
  const mdMatch = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10) - 1;
    const day = parseInt(mdMatch[2], 10);
    const result = new Date(today.getFullYear(), month, day);
    if (!isNaN(result.getTime())) {
      // If date is in the past, assume next year
      if (result < today) {
        result.setFullYear(result.getFullYear() + 1);
      }
      return result;
    }
  }

  // Couldn't parse
  return null;
}

// Extract #hashtags from markdown content
export function extractTags(markdown: string): string[] {
  // Match hashtags: # followed by word characters, but not at start of line (headings)
  // Also avoid matching inside URLs or code blocks
  const tagRegex = /(?:^|[^#\w/])#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const tags = new Set<string>();

  let match;
  while ((match = tagRegex.exec(markdown)) !== null) {
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags);
}

export interface TaskUpdate {
  completed?: boolean;
  title?: string; // Full title with due: syntax
}

export function updateTaskInBlocks(
  blocks: Block[],
  blockId: string,
  update: TaskUpdate
): Block[] {
  function updateBlock(block: Block): Block {
    if (block.id === blockId && block.type === 'checkListItem') {
      const updatedBlock = { ...block };

      // Update checked state if provided
      if (update.completed !== undefined) {
        updatedBlock.props = {
          ...updatedBlock.props,
          checked: update.completed
        };
      }

      // Update title/content if provided
      if (update.title !== undefined) {
        updatedBlock.content = [{ type: 'text', text: update.title, styles: {} }];
      }

      return updatedBlock;
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
