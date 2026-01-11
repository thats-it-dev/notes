import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import type { Task } from '../lib/types';
import { toggleTask } from '../lib/taskOperations';
import './TaskPanel.css';

export function TaskPanel() {
  const { taskPanelOpen, setTaskPanelOpen, selectedTags, taskFilter } = useAppStore();

  const tasks = useLiveQuery(async () => {
    const allTasks = await db.tasks.toArray();

    // Filter by completion status
    let filteredTasks = allTasks;
    if (taskFilter === 'active') {
      filteredTasks = allTasks.filter(task => !task.completed);
    } else if (taskFilter === 'completed') {
      filteredTasks = allTasks.filter(task => task.completed);
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      return filteredTasks.filter(task =>
        task.tags.some(tag => selectedTags.includes(tag))
      );
    }

    return filteredTasks;
  }, [taskFilter, selectedTags]);

  const handleToggleTask = async (task: Task) => {
    await toggleTask(task.id);
  };

  if (!taskPanelOpen) return null;

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <h2 className="task-panel-title">Tasks</h2>
        <button
          className="task-panel-close"
          onClick={() => setTaskPanelOpen(false)}
        >
          Close
        </button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <p className="task-panel-empty">No tasks yet</p>
      ) : (
        <div>
          {tasks.map(task => (
            <div key={task.id} className="task-item">
              <input
                type="checkbox"
                className="task-checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task)}
              />
              <span
                className={`task-title ${task.completed ? 'task-title--completed' : ''}`}
              >
                {task.title}
              </span>
              {task.tags.length > 0 && (
                <div className="task-tags">
                  {task.tags.map(tag => (
                    <span key={tag} className="task-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
