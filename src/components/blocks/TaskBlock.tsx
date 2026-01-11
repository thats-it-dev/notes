interface TaskBlockProps {
  content: string;
  onClick: () => void;
  onToggle: () => void;
}

export function TaskBlock({ content, onClick, onToggle }: TaskBlockProps) {
  const isCompleted = /^- \[x\]/i.test(content);
  const taskText = content.replace(/^- \[(x| )\] /i, '');

  const handleCheckboxChange = () => {
    onToggle();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div onClick={onClick} className="flex gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isCompleted}
        onClick={handleCheckboxClick}
        onChange={handleCheckboxChange}
        className="mt-1 cursor-pointer"
      />
      <span className={isCompleted ? 'line-through' : ''}>
        {taskText}
      </span>
    </div>
  );
}
