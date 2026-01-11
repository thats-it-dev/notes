interface ListBlockProps {
  content: string;
  type: 'bulletList' | 'numberedList';
  onClick: () => void;
}

export function ListBlock({ content, type, onClick }: ListBlockProps) {
  const cleanContent = type === 'bulletList'
    ? content.replace(/^- /, '')
    : content.replace(/^\d+\. /, '');

  if (type === 'bulletList') {
    return (
      <ul onClick={onClick} className="ml-6 cursor-pointer">
        <li>{cleanContent}</li>
      </ul>
    );
  }

  return (
    <ol onClick={onClick} className="ml-6 cursor-pointer">
      <li>{cleanContent}</li>
    </ol>
  );
}
