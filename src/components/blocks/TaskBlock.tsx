import { toggleTask } from '../../lib/taskOperations';

interface TaskBlockProps {
  content: string;
  onClick: () => void;
  taskId?: string;
}

export function TaskBlock({ content, onClick, taskId }: TaskBlockProps) {
  const isCompleted = /^- \[x\]/i.test(content);
  const taskText = content.replace(/^- \[(x| )\] /i, '');

  const handleCheckboxChange = () => {
    if (taskId) {
      toggleTask(taskId);
    }
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
