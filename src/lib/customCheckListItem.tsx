import { createReactBlockSpec } from '@blocknote/react';
import type { ReactCustomBlockRenderProps } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import { parseDueDate } from './blockNoteConverters';

/**
 * Custom checkListItem block that renders due dates inline.
 * Parses due:<target> syntax from the text and displays formatted dates.
 * Shows displayTitle (without due: syntax) when not editing,
 * shows full content when editing.
 */
export const CustomCheckListItem = createReactBlockSpec(
  {
    type: 'checkListItem',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      backgroundColor: defaultProps.backgroundColor,
      checked: {
        default: false,
      },
    },
    content: 'inline',
  },
  {
    render: (props: ReactCustomBlockRenderProps<any, any, any>) => {
      const { block, editor, contentRef } = props;
      const isChecked = block.props.checked;
      const [isEditing, setIsEditing] = useState(false);
      const contentElRef = useRef<HTMLDivElement>(null);

      // Get the text content to check for due date
      const content = block.content;
      const textContent = Array.isArray(content)
        ? content.map((item: any) => (item.type === 'text' ? item.text : '')).join('')
        : '';

      const { dueDate, displayTitle } = parseDueDate(textContent);
      const hasDueDate = !!dueDate;

      // Listen for selection changes to detect when cursor is in this block
      useEffect(() => {
        const checkSelection = () => {
          try {
            const cursorPosition = editor.getTextCursorPosition();
            const isCursorInBlock = cursorPosition?.block?.id === block.id;
            setIsEditing(isCursorInBlock);
          } catch {
            // Editor might not be ready
            setIsEditing(false);
          }
        };

        // Check initial state
        checkSelection();

        // Subscribe to selection changes
        const cleanup = editor.onSelectionChange(checkSelection);

        return cleanup;
      }, [editor, block.id]);

      const handleCheckboxChange = () => {
        editor.updateBlock(block, {
          props: { checked: !isChecked },
        });
      };

      const handleDisplayClick = () => {
        // Set cursor to this block when clicking display title
        editor.setTextCursorPosition(block, 'end');
      };

      return (
        <div
          className="bn-check-list-item"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            contentEditable={false}
            style={{
              marginTop: '4px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              flex: 1,
              textDecoration: isChecked ? 'line-through' : 'none',
              opacity: isChecked ? 0.6 : 1,
            }}
          >
            {/* Editable content - hidden when not editing and has due date */}
            <div
              ref={(el) => {
                contentElRef.current = el;
                if (typeof contentRef === 'function') {
                  contentRef(el);
                } else if (contentRef) {
                  (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              style={{
                flex: 1,
                // Hide when not editing and has due date syntax
                ...(hasDueDate && !isEditing ? {
                  position: 'absolute',
                  opacity: 0,
                  pointerEvents: 'none',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                } : {}),
              }}
            />
            {/* Display title - shown when not editing and has due date */}
            {hasDueDate && !isEditing && (
              <span
                onClick={handleDisplayClick}
                style={{
                  flex: 1,
                  cursor: 'text',
                }}
              >
                {displayTitle}
              </span>
            )}
            {dueDate && <DueDateBadge date={dueDate} />}
          </div>
        </div>
      );
    },
  }
);

function DueDateBadge({ date }: { date: Date }) {
  const formatDueDate = () => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const isOverdue = isPast(date) && !isToday(date);

  return (
    <span
      contentEditable={false}
      style={{
        fontSize: '12px',
        color: isOverdue ? 'var(--accent, #e53935)' : 'var(--text-muted, #888)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {formatDueDate()}
    </span>
  );
}
