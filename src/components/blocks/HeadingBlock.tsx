interface HeadingBlockProps {
  content: string;
  type: 'heading1' | 'heading2' | 'heading3';
  onClick: () => void;
}

export function HeadingBlock({ content, type, onClick }: HeadingBlockProps) {
  const cleanContent = content.replace(/^#{1,3} /, '');

  const baseClasses = 'font-bold cursor-pointer';

  if (type === 'heading1') {
    return (
      <h1 className={`${baseClasses} text-2xl`} onClick={onClick}>
        {cleanContent}
      </h1>
    );
  }

  if (type === 'heading2') {
    return (
      <h2 className={`${baseClasses} text-xl`} onClick={onClick}>
        {cleanContent}
      </h2>
    );
  }

  return (
    <h3 className={`${baseClasses} text-lg`} onClick={onClick}>
      {cleanContent}
    </h3>
  );
}
