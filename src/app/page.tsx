"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TaskList from '@/components/task-list';
import TaskFormDialog from '@/components/task-form-dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedTasks = localStorage.getItem('tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
         setTasks([
          { id: '1', title: 'Setup your first task', description: 'Start organizing your life with TaskFlow.', completed: false, createdAt: Date.now() },
          { id: '2', title: 'Explore features', description: 'Check out editing, deleting, and completing tasks.', completed: false, createdAt: Date.now() - 1000 },
          { id: '3', title: 'Conquer the day', description: 'Stay productive!', completed: true, createdAt: Date.now() - 2000 },
        ]);
      }
    } catch (error) {
      console.error("Failed to parse tasks from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }, [tasks, isMounted]);

  const handleAddTask = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(
      tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    if (editingTask) {
      setTasks(
        tasks.map(task => (task.id === editingTask.id ? { ...task, ...taskData } : task))
      );
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        ...taskData,
        completed: false,
        createdAt: Date.now(),
      };
      setTasks([newTask, ...tasks]);
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const filteredTasks = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
    if (filter === 'active') {
      return sortedTasks.filter(task => !task.completed);
    }
    if (filter === 'completed') {
      return sortedTasks.filter(task => task.completed);
    }
    return sortedTasks;
  }, [tasks, filter]);
  
  if (!isMounted) {
    return null; 
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="z-10 w-full max-w-4xl items-center justify-between font-headline text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">TaskFlow</h1>
        <p className="text-muted-foreground mb-8">Your calm and focused todo manager.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={handleAddTask} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>

        <TaskList 
          tasks={filteredTasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
        />
        
        <TaskFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveTask}
          task={editingTask}
        />
      </div>
    </main>
  );
}
