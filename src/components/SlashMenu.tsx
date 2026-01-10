import { useEffect, useRef } from 'react';
import type { BlockType } from '../lib/blockTypes';
import './SlashMenu.css';

interface SlashMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onSelectType: (type: BlockType) => void;
  onClose: () => void;
}

const BLOCK_OPTIONS: Array<{ type: BlockType; label: string; icon: string }> = [
  { type: 'heading1', label: 'Heading 1', icon: 'H1' },
  { type: 'heading2', label: 'Heading 2', icon: 'H2' },
  { type: 'heading3', label: 'Heading 3', icon: 'H3' },
  { type: 'task', label: 'Task', icon: '☑' },
  { type: 'bulletList', label: 'Bullet List', icon: '•' },
  { type: 'numberedList', label: 'Numbered List', icon: '1.' },
  { type: 'code', label: 'Code Block', icon: '</>' },
];

export function SlashMenu({ isOpen, position, onSelectType, onClose }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {BLOCK_OPTIONS.map(option => (
        <div
          key={option.type}
          className="slash-menu-item"
          onClick={() => onSelectType(option.type)}
        >
          <span className="slash-menu-icon">{option.icon}</span>
          <span className="slash-menu-label">{option.label}</span>
        </div>
      ))}
    </div>
  );
}
