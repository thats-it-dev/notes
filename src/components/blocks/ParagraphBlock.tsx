interface ParagraphBlockProps {
  content: string;
  onClick: () => void;
}

export function ParagraphBlock({ content, onClick }: ParagraphBlockProps) {
  return (
    <p onClick={onClick} className="min-h-[1.5em] cursor-pointer">
      {content || '\u00A0'}
    </p>
  );
}
