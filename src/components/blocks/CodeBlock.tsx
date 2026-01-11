interface CodeBlockProps {
  content: string;
  onClick: () => void;
}

export function CodeBlock({ content, onClick }: CodeBlockProps) {
  return (
    <pre
      onClick={onClick}
      className="bg-gray-100 p-4 h-screen cursor-pointer"
    >
      <code>{content}</code>
    </pre>
  );
}
