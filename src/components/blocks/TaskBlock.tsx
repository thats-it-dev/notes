interface TaskBlockProps {
  content: string;
  onClick: () => void;
  onToggle: () => void;
}

export function TaskBlock({ content, onClick, onToggle }: TaskBlockProps) {
  const isCompleted = /^- \[x\]/i.test(content);
  const taskText = content.replace(/^- \[(x| )\] /i, '');

  const handleCheckboxClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div onClick={onClick} className="flex gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleCheckboxClick}
        className="mt-1 cursor-pointer"
      />
      <span className={isCompleted ? 'line-through' : ''}>
        {taskText}
      </span>
    </div>
  );
}
