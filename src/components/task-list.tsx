import type { Task } from '@/lib/types';
import TaskItem from './task-item';
import { FileQuestion } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
}

export default function TaskList({ tasks, onEdit, onDelete, onToggleComplete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg mt-8 bg-card/50">
        <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold font-headline">No tasks here!</h2>
        <p className="text-muted-foreground mt-2">Looks like it's a clear day. Add a new task to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  );
}
