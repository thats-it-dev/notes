import { defaultValueCtx, Editor, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
import '@milkdown/theme-nord/style.css';

interface MilkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function MilkdownEditorInner({ content, onChange }: MilkdownEditorProps) {
  useEditor((root) =>
    Editor.make()
      .use(commonmark)
      .use(listener)
      .use(history)
      .config((ctx) => {
        nord(ctx);
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onChange(markdown);
        });
      })
  );

  return <Milkdown />;
}

export function MilkdownEditor({ content, onChange }: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        minHeight: '400px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <MilkdownEditorInner content={content} onChange={onChange} />
      </div>
    </MilkdownProvider>
  );
}
