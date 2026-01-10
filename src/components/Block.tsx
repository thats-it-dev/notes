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
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [localContent, setLocalContent] = useState(block.content);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const wasActiveRef = useRef(isActive);
  const isUpdatingFromInputRef = useRef(false);

  // Set initial content when ref is attached
  const setContentEditableRef = (element: HTMLDivElement | null) => {
    if (element && element.textContent === '') {
      element.textContent = localContent;
    }
    contentEditableRef.current = element;
  };

  // Manually update contentEditable only when needed
  useEffect(() => {
    if (contentEditableRef.current && !isUpdatingFromInputRef.current) {
      const currentText = contentEditableRef.current.textContent || '';
      if (currentText !== localContent) {
        contentEditableRef.current.textContent = localContent;
      }
    }
    isUpdatingFromInputRef.current = false;
  }, [localContent]);

  // Only sync content from props when not actively editing
  useEffect(() => {
    if (!isActive) {
      setLocalContent(block.content);
    }
  }, [block.content, isActive]);

  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current;

    if (becameActive && contentEditableRef.current) {
      // Sync content when becoming active
      setLocalContent(block.content);
      contentEditableRef.current.textContent = block.content;
      contentEditableRef.current.focus();

      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      if (contentEditableRef.current.childNodes.length > 0) {
        range.setStart(contentEditableRef.current.childNodes[0], block.content.length);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }

    wasActiveRef.current = isActive;
  }, [isActive, block.content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    isUpdatingFromInputRef.current = true;
    setLocalContent(newContent);
    onChange(newContent);

    // Show slash menu if content is '/'
    if (newContent === '/') {
      const rect = e.currentTarget.getBoundingClientRect();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    } else if (e.key === 'Backspace' && localContent === '') {
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
      <div
        ref={setContentEditableRef}
        contentEditable
        onInput={handleInput}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        style={{
          outline: 'none',
          minHeight: '1.5em',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}
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

      case 'task':
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
