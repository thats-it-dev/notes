import { useState, useEffect } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import { parseMarkdownToBlocks, blocksToMarkdown } from '../lib/blockParser';
import { Block } from './Block';

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function BlockEditor({ content, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Parse markdown to blocks on mount and when content changes externally
  useEffect(() => {
    const parsedBlocks = parseMarkdownToBlocks(content);
    setBlocks(parsedBlocks);

    // Set first block as active if none is active
    if (!activeBlockId && parsedBlocks.length > 0) {
      setActiveBlockId(parsedBlocks[0].id);
    }
  }, [content]);

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
    const newBlock: BlockType = {
      id: `block-${Date.now()}`,
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
    const updatedBlocks = blocks.filter((b) => b.id !== blockId);

    // Focus previous block
    const prevBlock = updatedBlocks[Math.max(0, blockIndex - 1)];
    if (prevBlock) {
      setActiveBlockId(prevBlock.id);
    }

    setBlocks(updatedBlocks);
    syncToMarkdown(updatedBlocks);
  };

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        minHeight: '400px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          isActive={activeBlockId === block.id}
          onFocus={() => setActiveBlockId(block.id)}
          onBlur={() => {}}
          onChange={(content) => handleBlockChange(block.id, content)}
          onEnter={() => handleEnter(block.id)}
          onBackspace={() => handleBackspace(block.id)}
          onTypeChange={(newType) => handleBlockTypeChange(block.id, newType)}
        />
      ))}
    </div>
  );
}
