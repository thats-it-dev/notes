import type { Block as BlockType } from '../lib/blockTypes';
import { BlockEditor } from './BlockEditor';
import { BlockRenderer } from './BlockRenderer';

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  onActivate: () => void;
  onBlur: (content: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onTypeChange: (newType: string) => void;
}

export function Block({
  block,
  isActive,
  onActivate,
  onBlur,
  onEnter,
  onBackspace,
  onTypeChange,
}: BlockProps) {
  return (
    <div className="mb-2">
      {isActive ? (
        <BlockEditor
          initialContent={block.content}
          blockType={block.type}
          onBlur={onBlur}
          onEnter={onEnter}
          onBackspace={onBackspace}
          onTypeChange={onTypeChange}
        />
      ) : (
        <BlockRenderer
          block={block}
          onActivate={onActivate}
        />
      )}
    </div>
  );
}
