import { useState, useEffect, useRef } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import { detectBlockType } from '../lib/blockParser';
import { SlashMenu } from './SlashMenu';

interface BlockEditorProps {
  initialContent: string;
  blockType: BlockType['type'];
  onBlur: (finalContent: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onTypeChange: (newType: string) => void;
}

export function BlockEditor({
  initialContent,
  blockType,
  onBlur,
  onEnter,
  onBackspace,
  onTypeChange,
}: BlockEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus and position cursor on mount
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      // Move cursor to end immediately
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to get accurate scrollHeight
      textarea.style.height = 'auto';
      // Set height to match content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Show slash menu if content is '/'
    if (newContent === '/') {
      const rect = e.target.getBoundingClientRect();
      setSlashMenuPosition({
        top: rect.bottom,
        left: rect.left,
      });
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);

      // Auto-detect block type changes
      const detectedType = detectBlockType(newContent);
      if (detectedType !== blockType) {
        onTypeChange(detectedType);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      e.preventDefault();
      onBackspace();
    }
  };

  const handleBlur = () => {
    onBlur(content);
  };

  const handleSelectBlockType = (newType: BlockType['type']) => {
    setShowSlashMenu(false);
    setContent('');
    onTypeChange(newType);
  };

  return (
    <>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full border-none outline-none resize-none min-h-[1.5em] font-mono bg-transparent p-0 overflow-hidden"
      />
      <SlashMenu
        isOpen={showSlashMenu}
        position={slashMenuPosition}
        onSelectType={handleSelectBlockType}
        onClose={() => setShowSlashMenu(false)}
      />
    </>
  );
}
