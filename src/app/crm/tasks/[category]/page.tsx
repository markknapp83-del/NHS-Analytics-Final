'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { nhsDatabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Building2,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Task {
  id: string;
  trust_code: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  task_title: string;
  task_description: string | null;
  due_date: string;
  assigned_to: string;
  completed: boolean;
  completed_date: string | null;
  created_at: string;
  created_by: string | null;
  priority: 'high' | 'medium' | 'low';
  trust_name?: string;
  contact_name?: string;
  opportunity_name?: string;
}

export default function TaskCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const category = params.category as string;

  useEffect(() => {
    if (user?.email) {
      fetchTasks();
    }
  }, [user?.email, category]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        assigned_to: user?.email || '',
      });

      const response = await fetch(`/api/crm/tasks?${params}`);
      const result = await response.json();

      if (result.data) {
        // Fetch related data for each task
        const tasksWithDetails = await Promise.all(
          result.data.map(async (task: Task) => {
            const details = { ...task };

            // Fetch trust name
            if (task.trust_code) {
              const trustResponse = await fetch(`/api/crm/accounts/${task.trust_code}`);
              const trustResult = await trustResponse.json();
              if (trustResult.data) {
                details.trust_name = trustResult.data.trust_name;
              }
            }

            // Fetch contact name
            if (task.contact_id) {
              const contactResponse = await fetch(`/api/crm/contacts/${task.contact_id}`);
              const contactResult = await contactResponse.json();
              if (contactResult.data) {
                details.contact_name = contactResult.data.full_name;
              }
            }

            // Fetch opportunity name
            if (task.opportunity_id) {
              const oppResponse = await fetch(`/api/crm/opportunities/${task.opportunity_id}`);
              const oppResult = await oppResponse.json();
              if (oppResult.data) {
                details.opportunity_name = oppResult.data.opportunity_name;
              }
            }

            return details;
          })
        );

        setTasks(filterTasksByCategory(tasksWithDetails));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeTaskByDate = (task: Task) => {
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (dueDate < today && !task.completed) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';
    if (dueDate >= tomorrow && dueDate < tomorrowEnd) return 'tomorrow';
    if (dueDate >= tomorrowEnd && dueDate < weekEnd) return 'this-week';
    return 'later';
  };

  const filterTasksByCategory = (allTasks: Task[]) => {
    switch (category) {
      case 'overdue':
        return allTasks.filter((t) => categorizeTaskByDate(t) === 'overdue');
      case 'today':
        return allTasks.filter((t) => categorizeTaskByDate(t) === 'today');
      case 'tomorrow':
        return allTasks.filter((t) => categorizeTaskByDate(t) === 'tomorrow');
      case 'this-week':
        return allTasks.filter((t) => categorizeTaskByDate(t) === 'this-week');
      case 'later':
        return allTasks.filter((t) => categorizeTaskByDate(t) === 'later');
      case 'high':
        return allTasks.filter((t) => t.priority === 'high' && !t.completed);
      case 'medium':
        return allTasks.filter((t) => t.priority === 'medium' && !t.completed);
      case 'low':
        return allTasks.filter((t) => t.priority === 'low' && !t.completed);
      default:
        return [];
    }
  };

  const getCategoryTitle = () => {
    const titles: Record<string, string> = {
      overdue: 'Overdue Tasks',
      today: "Today's Tasks",
      tomorrow: "Tomorrow's Tasks",
      'this-week': 'This Week Tasks',
      later: 'Later Tasks',
      high: 'High Priority Tasks',
      medium: 'Medium Priority Tasks',
      low: 'Low Priority Tasks',
    };
    return titles[category] || 'Tasks';
  };

  const handleMarkComplete = async (task: Task) => {
    try {
      const payload = {
        completed: !task.completed,
        completed_date: !task.completed ? new Date().toISOString() : null,
      };

      const response = await fetch(`/api/crm/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.data) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'destructive' as const,
      medium: 'secondary' as const,
      low: 'outline' as const,
    };
    const labels = {
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority',
    };
    return (
      <Badge variant={variants[priority]} className="text-xs">
        {labels[priority]}
      </Badge>
    );
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const isAssignedByOther = task.created_by && task.created_by !== user?.email;

    return (
      <Card className="mb-3">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="pt-1">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => handleMarkComplete(task)}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3
                    className={`font-semibold text-gray-900 ${
                      task.completed ? 'line-through text-gray-500' : ''
                    }`}
                  >
                    {task.task_title}
                  </h3>

                  {task.task_description && (
                    <p className="text-sm text-gray-600 mt-1">{task.task_description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    {getPriorityBadge(task.priority)}

                    {task.trust_code && task.trust_name && (
                      <Link
                        href={`/crm/accounts/${task.trust_code}`}
                        className="inline-flex items-center gap-1 text-xs text-[#005eb8] hover:underline"
                      >
                        <Building2 className="h-3 w-3" />
                        {task.trust_name}
                      </Link>
                    )}

                    {task.contact_name && (
                      <Badge variant="outline" className="text-xs">
                        Contact: {task.contact_name}
                      </Badge>
                    )}

                    {task.opportunity_name && (
                      <Badge variant="outline" className="text-xs">
                        Opportunity: {task.opportunity_name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </div>

                    {isAssignedByOther && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <User className="h-3 w-3" />
                        Assigned by {task.created_by}
                      </div>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push('/crm/tasks')}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005eb8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/crm/tasks')} size="sm">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to My Tasks
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getCategoryTitle()}</h1>
          <p className="text-gray-600 mt-1">{tasks.length} tasks</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No tasks in this category</h3>
            <p className="text-gray-600 mt-1">
              <Link href="/crm/tasks" className="text-[#005eb8] hover:underline">
                Return to My Tasks
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
