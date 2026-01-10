import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import type { Task } from '../lib/types';
import { toggleTask } from '../lib/taskOperations';

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
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '400px',
      background: 'white',
      borderLeft: '1px solid #ddd',
      padding: '2rem',
      overflowY: 'auto',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Tasks</h2>
        <button onClick={() => setTaskPanelOpen(false)}>Close</button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <p style={{ color: '#666' }}>No tasks yet</p>
      ) : (
        <div>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task)}
              />
              <span style={{
                flex: 1,
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? '#999' : '#1a1a1a'
              }}>
                {task.title}
              </span>
              {task.tags.length > 0 && (
                <div>
                  {task.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.375rem',
                        background: '#e0e0e0',
                        borderRadius: '3px',
                        marginLeft: '0.25rem'
                      }}
                    >
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
