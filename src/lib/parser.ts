import { ParsedContent } from './types';

const HASHTAG_REGEX = /#[\w-]+/g;
const TASK_REGEX = /^[\s-]*\[( |x|X)\]\s+(.+)$/;
const HEADING_REGEX = /^#+\s+(.+)$/;

export function parseContent(content: string): ParsedContent {
  const lines = content.split('\n');

  // Extract title
  let title = 'Untitled';
  const firstLine = lines[0]?.trim();
  if (firstLine) {
    const headingMatch = firstLine.match(HEADING_REGEX);
    if (headingMatch) {
      title = headingMatch[1];
    } else {
      title = firstLine;
    }
    // Truncate to 500 chars
    if (title.length > 500) {
      title = title.substring(0, 500);
    }
  }

  // Extract all hashtags
  const allHashtags = content.match(HASHTAG_REGEX) || [];
  const uniqueTags = [...new Set(allHashtags.map(tag => tag.substring(1)))];

  // Extract tasks
  const tasks = lines
    .map((line, index) => {
      const match = line.match(TASK_REGEX);
      if (!match) return null;

      const [, checkbox, taskText] = match;
      const completed = checkbox.toLowerCase() === 'x';

      // Extract hashtags from this line
      const taskHashtags = taskText.match(HASHTAG_REGEX) || [];
      const taskTags = taskHashtags.map(tag => tag.substring(1));

      return {
        title: taskText,
        completed,
        lineNumber: index,
        tags: taskTags,
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  return {
    title,
    tags: uniqueTags,
    tasks,
  };
}
