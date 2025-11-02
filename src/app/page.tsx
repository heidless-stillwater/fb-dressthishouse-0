
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, LogOut } from 'lucide-react';
import TaskList from '@/components/task-list';
import TaskFormDialog from '@/components/task-form-dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useAuth, useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);

  const { user, loading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();

  const tasksQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'tasks'),
        orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: tasks, loading: tasksLoading } = useCollection<Task>(tasksQuery);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && isMounted) {
      router.push('/login');
    }
  }, [user, loading, router, isMounted]);

  const handleAddTask = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user || !firestore) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
    await deleteDoc(taskRef);
  };

  const handleToggleComplete = async (taskId: string) => {
    if (!user || !firestore) return;
    const task = tasks?.find(t => t.id === taskId);
    if (!task) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
    await updateDoc(taskRef, { completed: !task.completed });
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    if (!user || !firestore) return;
    
    if (editingTask) {
        const taskRef = doc(firestore, 'users', user.uid, 'tasks', editingTask.id);
        await updateDoc(taskRef, {
            title: taskData.title,
            description: taskData.description,
        });
    } else {
        const collectionRef = collection(firestore, 'users', user.uid, 'tasks');
        await addDoc(collectionRef, {
            ...taskData,
            completed: false,
            createdAt: serverTimestamp(),
        });
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const filteredTasks = useMemo(() => {
    const sortedTasks = tasks ? [...tasks].sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : a.createdAt;
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : b.createdAt;
        return dateB - dateA;
    }) : [];

    if (filter === 'active') {
      return sortedTasks.filter(task => !task.completed);
    }
    if (filter === 'completed') {
      return sortedTasks.filter(task => task.completed);
    }
    return sortedTasks;
  }, [tasks, filter]);
  
  const handleSignOut = async () => {
    if(auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  if (loading || !isMounted || !user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="z-10 w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
            <div className="text-center sm:text-left">
                <h1 className="text-4xl md:text-5xl font-bold">TaskFlow</h1>
                <p className="text-muted-foreground">Welcome, {user.email}</p>
            </div>
            <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
        </header>
        
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
          loading={tasksLoading}
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
