import { useRef, useEffect, useState } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import { detectBlockType } from '../lib/blockParser';

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

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.content]);

  useEffect(() => {
    if (isActive && contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  }, [isActive]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    setLocalContent(newContent);
    onChange(newContent);

    // Auto-detect block type changes
    const detectedType = detectBlockType(newContent);
    if (detectedType !== block.type) {
      onTypeChange(detectedType);
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

  const renderEditMode = () => {
    return (
      <div
        ref={contentEditableRef}
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
      >
        {localContent}
      </div>
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
    <div style={{ marginBottom: '0.5rem' }}>
      {isActive ? renderEditMode() : renderViewMode()}
    </div>
  );
}
