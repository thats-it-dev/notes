import type { Block as BlockType } from '../lib/blockTypes';
import { HeadingBlock } from './blocks/HeadingBlock';
import { TaskBlock } from './blocks/TaskBlock';
import { ListBlock } from './blocks/ListBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { ParagraphBlock } from './blocks/ParagraphBlock';

interface BlockRendererProps {
  block: BlockType;
  onActivate: () => void;
}

export function BlockRenderer({ block, onActivate }: BlockRendererProps) {
  switch (block.type) {
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return <HeadingBlock content={block.content} type={block.type} onClick={onActivate} />;

    case 'task':
      return (
        <TaskBlock
          content={block.content}
          onClick={onActivate}
          taskId={block.metadata?.taskId}
        />
      );

    case 'bulletList':
    case 'numberedList':
      return <ListBlock content={block.content} type={block.type} onClick={onActivate} />;

    case 'code':
      return <CodeBlock content={block.content} onClick={onActivate} />;

    case 'paragraph':
    default:
      return <ParagraphBlock content={block.content} onClick={onActivate} />;
  }
}
