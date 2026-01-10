import { useRef, useEffect, useState } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import { detectBlockType } from '../lib/blockParser';
import { SlashMenu } from './SlashMenu';

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (content: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onTypeChange: (newType: string) => void;
}

export function Block({
  block,
  isActive,
  onFocus,
  onBlur,
  onChange,
  onEnter,
  onBackspace,
  onTypeChange,
}: BlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(block.content);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  // Sync from parent when not active
  useEffect(() => {
    if (!isActive) {
      setLocalContent(block.content);
    }
  }, [block.content, isActive]);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      setLocalContent(block.content);
      textareaRef.current.focus();
      // Move cursor to end on next tick after content is set
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 0);
    }
  }, [isActive, block.content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange(newContent);

    // Show slash menu if content is '/'
    if (newContent === '/') {
      const rect = e.target.getBoundingClientRect();
      setSlashMenuPosition({
        top: rect.bottom,
        left: rect.left
      });
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);

      // Auto-detect block type changes
      const detectedType = detectBlockType(newContent);
      if (detectedType !== block.type) {
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

  const handleSelectBlockType = (newType: BlockType['type']) => {
    setShowSlashMenu(false);
    setLocalContent('');
    onChange('');
    onTypeChange(newType);
  };

  const renderEditMode = () => {
    return (
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          resize: 'none',
          minHeight: '1.5em',
          fontFamily: 'monospace',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          padding: 0,
          background: 'transparent',
        }}
        rows={1}
      />
    );
  };

  const renderViewMode = () => {
    const content = localContent;

    switch (block.type) {
      case 'heading1':
        return (
          <h1
            onClick={onFocus}
            style={{ fontSize: '2em', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {content.replace(/^# /, '')}
          </h1>
        );

      case 'heading2':
        return (
          <h2
            onClick={onFocus}
            style={{ fontSize: '1.5em', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {content.replace(/^## /, '')}
          </h2>
        );

      case 'heading3':
        return (
          <h3
            onClick={onFocus}
            style={{ fontSize: '1.25em', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {content.replace(/^### /, '')}
          </h3>
        );

      case 'task': {
        const isCompleted = content.match(/^- \[x\]/i);
        const taskText = content.replace(/^- \[(x| )\] /i, '');
        return (
          <div onClick={onFocus} style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!isCompleted}
              readOnly
              style={{ marginTop: '0.25rem' }}
            />
            <span style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
              {taskText}
            </span>
          </div>
        );
      }

      case 'bulletList':
        return (
          <ul onClick={onFocus} style={{ marginLeft: '1.5rem', cursor: 'pointer' }}>
            <li>{content.replace(/^- /, '')}</li>
          </ul>
        );

      case 'numberedList':
        return (
          <ol onClick={onFocus} style={{ marginLeft: '1.5rem', cursor: 'pointer' }}>
            <li>{content.replace(/^\d+\. /, '')}</li>
          </ol>
        );

      case 'code':
        return (
          <pre
            onClick={onFocus}
            style={{
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              cursor: 'pointer',
            }}
          >
            <code>{content}</code>
          </pre>
        );

      case 'paragraph':
      default:
        return (
          <p onClick={onFocus} style={{ minHeight: '1.5em', cursor: 'pointer' }}>
            {content || '\u00A0'}
          </p>
        );
    }
  };

  return (
    <>
      <div style={{ marginBottom: '0.5rem' }}>
        {isActive ? renderEditMode() : renderViewMode()}
      </div>
      <SlashMenu
        isOpen={showSlashMenu}
        position={slashMenuPosition}
        onSelectType={handleSelectBlockType}
        onClose={() => setShowSlashMenu(false)}
      />
    </>
  );
}
