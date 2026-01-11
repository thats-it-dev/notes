import { useState, useEffect, useRef } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import { parseMarkdownToBlocks, blocksToMarkdown } from '../lib/blockParser';
import { Block } from './Block';

interface BlocksManagerProps {
  noteId: string;
  content: string;
  onChange: (content: string) => void;
}

export function BlocksManager({ noteId, content, onChange }: BlocksManagerProps) {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const blockIdCounter = useRef(0);

  // Parse markdown to blocks on mount and when content changes externally
  useEffect(() => {
    const parseContent = async () => {
      const parsedBlocks = await parseMarkdownToBlocks(content, noteId);
      setBlocks(parsedBlocks);

      // Set first block as active only on initial mount
      if (!hasInitialized.current && parsedBlocks.length > 0) {
        setActiveBlockId(parsedBlocks[0].id);
        hasInitialized.current = true;
      }
    };

    parseContent();
  }, [content, noteId]);

  // Sync blocks to markdown and call onChange
  const syncToMarkdown = (updatedBlocks: BlockType[]) => {
    const markdown = blocksToMarkdown(updatedBlocks);
    onChange(markdown);
  };

  const handleBlockChange = (blockId: string, newContent: string) => {
    const updatedBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, content: newContent } : b
    );
    setBlocks(updatedBlocks);
    syncToMarkdown(updatedBlocks);
  };

  const handleBlockTypeChange = (blockId: string, newType: string) => {
    const updatedBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, type: newType as BlockType['type'] } : b
    );
    setBlocks(updatedBlocks);
    syncToMarkdown(updatedBlocks);
  };

  const handleEnter = (blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    blockIdCounter.current += 1;
    const newBlock: BlockType = {
      id: `block-${blockIdCounter.current}`,
      type: 'paragraph',
      content: '',
    };

    const updatedBlocks = [
      ...blocks.slice(0, blockIndex + 1),
      newBlock,
      ...blocks.slice(blockIndex + 1),
    ];

    setBlocks(updatedBlocks);
    setActiveBlockId(newBlock.id);
    syncToMarkdown(updatedBlocks);
  };

  const handleBackspace = (blockId: string) => {
    if (blocks.length <= 1) return;

    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === 0) return; // Can't backspace from first block

    const currentBlock = blocks[blockIndex];
    const prevBlock = blocks[blockIndex - 1];

    // Merge current block's content into previous block
    const mergedContent = prevBlock.content + currentBlock.content;

    const updatedBlocks = blocks
      .filter((b) => b.id !== blockId)
      .map((b) =>
        b.id === prevBlock.id
          ? { ...b, content: mergedContent }
          : b
      );

    setBlocks(updatedBlocks);
    setActiveBlockId(prevBlock.id);
    syncToMarkdown(updatedBlocks);
  };

  return (
    <div className="p-4 h-svh overflow-y-auto">
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          isActive={activeBlockId === block.id}
          onActivate={() => setActiveBlockId(block.id)}
          onBlur={(content) => handleBlockChange(block.id, content)}
          onEnter={() => handleEnter(block.id)}
          onBackspace={() => handleBackspace(block.id)}
          onTypeChange={(newType) => handleBlockTypeChange(block.id, newType)}
        />
      ))}
    </div>
  );
}
