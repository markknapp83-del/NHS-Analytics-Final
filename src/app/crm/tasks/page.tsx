'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { nhsDatabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  AlertCircle,
  User,
  Building2,
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

interface Trust {
  code: string;
  name: string;
}

interface Contact {
  id: string;
  full_name: string;
  trust_code: string;
}

interface Opportunity {
  id: string;
  opportunity_name: string;
  trust_code: string;
}

interface TaskFormData {
  task_title: string;
  task_description: string;
  trust_code: string;
  contact_id: string;
  opportunity_id: string;
  due_date: Date | undefined;
  assigned_to: string;
  priority: 'high' | 'medium' | 'low';
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortMode, setSortMode] = useState<'dueDate' | 'priority'>('dueDate');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    priority?: 'high' | 'medium' | 'low';
    due_date?: Date;
    assigned_to?: string;
  }>({});
  const [formData, setFormData] = useState<TaskFormData>({
    task_title: '',
    task_description: '',
    trust_code: '',
    contact_id: '',
    opportunity_id: '',
    due_date: undefined,
    assigned_to: user?.email || '',
    priority: 'medium',
  });

  // Section collapse states
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [todayOpen, setTodayOpen] = useState(true);
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const [thisWeekOpen, setThisWeekOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(true);
  const [highOpen, setHighOpen] = useState(true);
  const [mediumOpen, setMediumOpen] = useState(true);
  const [lowOpen, setLowOpen] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchTasks();
      fetchTrusts();
      fetchContacts();
      fetchOpportunities();
    }
  }, [user?.email]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      console.log('[fetchTasks] User email:', user?.email);
      const params = new URLSearchParams({
        assigned_to: user?.email || '',
      });

      console.log('[fetchTasks] Fetching tasks with params:', params.toString());
      const response = await fetch(`/api/crm/tasks?${params}`);
      const result = await response.json();
      console.log('[fetchTasks] Response:', result);

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

        setTasks(tasksWithDetails);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrusts = async () => {
    try {
      const trustList = await nhsDatabase.getAllTrusts();
      setTrusts(trustList);
    } catch (error) {
      console.error('Error fetching trusts:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/crm/contacts');
      const result = await response.json();
      if (result.data) {
        setContacts(result.data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/crm/opportunities');
      const result = await response.json();
      if (result.data) {
        setOpportunities(result.data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.task_title || !formData.due_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        task_title: formData.task_title,
        task_description: formData.task_description || null,
        trust_code: formData.trust_code || null,
        contact_id: formData.contact_id || null,
        opportunity_id: formData.opportunity_id || null,
        due_date: format(formData.due_date, 'yyyy-MM-dd'),
        assigned_to: formData.assigned_to,
        priority: formData.priority,
      };

      const response = await fetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.data) {
        setIsDialogOpen(false);
        resetForm();
        fetchTasks();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !formData.task_title || !formData.due_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        task_title: formData.task_title,
        task_description: formData.task_description || null,
        trust_code: formData.trust_code || null,
        contact_id: formData.contact_id || null,
        opportunity_id: formData.opportunity_id || null,
        due_date: format(formData.due_date, 'yyyy-MM-dd'),
        assigned_to: formData.assigned_to,
        priority: formData.priority,
      };

      const response = await fetch(`/api/crm/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.data) {
        setIsDialogOpen(false);
        setEditingTask(null);
        resetForm();
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        fetchTasks();
      } else {
        console.error('Delete failed:', result.error);
        alert('Failed to delete task: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  // Selection helper functions
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  // Bulk action handlers
  const handleBulkComplete = async () => {
    if (selectedTaskIds.length === 0) return;

    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          fetch(`/api/crm/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              completed: true,
              completed_date: new Date().toISOString(),
            }),
          })
        )
      );

      clearSelection();
      fetchTasks();
    } catch (error) {
      console.error('Error completing tasks:', error);
      alert('Failed to complete some tasks. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedTaskIds.length} task${
          selectedTaskIds.length > 1 ? 's' : ''
        }?`
      )
    ) {
      return;
    }

    try {
      const results = await Promise.all(
        selectedTaskIds.map((taskId) =>
          fetch(`/api/crm/tasks/${taskId}`, {
            method: 'DELETE',
          }).then((res) => res.json())
        )
      );

      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        console.error('Some deletions failed:', failures);
        alert(`${failures.length} task(s) failed to delete.`);
      }

      clearSelection();
      fetchTasks();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      alert('Failed to delete some tasks. Please try again.');
    }
  };

  const handleBulkEditSubmit = async () => {
    if (selectedTaskIds.length === 0) return;

    try {
      const updates: any = {};
      if (bulkEditData.priority) updates.priority = bulkEditData.priority;
      if (bulkEditData.due_date) updates.due_date = format(bulkEditData.due_date, 'yyyy-MM-dd');
      if (bulkEditData.assigned_to) updates.assigned_to = bulkEditData.assigned_to;

      if (Object.keys(updates).length === 0) {
        alert('Please select at least one field to update');
        return;
      }

      await Promise.all(
        selectedTaskIds.map((taskId) =>
          fetch(`/api/crm/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
        )
      );

      setIsBulkEditDialogOpen(false);
      setBulkEditData({});
      clearSelection();
      fetchTasks();
    } catch (error) {
      console.error('Error updating tasks:', error);
      alert('Failed to update some tasks. Please try again.');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      task_title: task.task_title,
      task_description: task.task_description || '',
      trust_code: task.trust_code || '',
      contact_id: task.contact_id || '',
      opportunity_id: task.opportunity_id || '',
      due_date: task.due_date ? new Date(task.due_date) : undefined,
      assigned_to: task.assigned_to,
      priority: task.priority || 'medium',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      task_title: '',
      task_description: '',
      trust_code: '',
      contact_id: '',
      opportunity_id: '',
      due_date: undefined,
      assigned_to: user?.email || '',
      priority: 'medium',
    });
    setEditingTask(null);
  };

  const categorizeTaskByDate = (task: Task) => {
    if (task.completed && !showCompleted) return null;

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
    if (dueDate >= tomorrowEnd && dueDate < weekEnd) return 'thisWeek';
    return 'later';
  };

  const categorizeTaskByPriority = (task: Task) => {
    if (task.completed && !showCompleted) return null;
    return task.priority;
  };

  const groupedTasks = sortMode === 'dueDate'
    ? {
        overdue: tasks.filter((t) => categorizeTaskByDate(t) === 'overdue'),
        today: tasks.filter((t) => categorizeTaskByDate(t) === 'today'),
        tomorrow: tasks.filter((t) => categorizeTaskByDate(t) === 'tomorrow'),
        thisWeek: tasks.filter((t) => categorizeTaskByDate(t) === 'thisWeek'),
        later: tasks.filter((t) => categorizeTaskByDate(t) === 'later'),
      }
    : {
        high: tasks.filter((t) => categorizeTaskByPriority(t) === 'high'),
        medium: tasks.filter((t) => categorizeTaskByPriority(t) === 'medium'),
        low: tasks.filter((t) => categorizeTaskByPriority(t) === 'low'),
      };

  // KPI calculations
  const kpiOverdue = tasks.filter((t) => !t.completed && categorizeTaskByDate(t) === 'overdue').length;
  const kpiToday = tasks.filter((t) => !t.completed && categorizeTaskByDate(t) === 'today').length;
  const kpiThisWeek = tasks.filter((t) => {
    if (t.completed) return false;
    const cat = categorizeTaskByDate(t);
    return cat === 'today' || cat === 'tomorrow' || cat === 'thisWeek';
  }).length;

  const filteredContactsForTrust = contacts.filter(
    (contact) => !formData.trust_code || contact.trust_code === formData.trust_code
  );

  const filteredOpportunitiesForTrust = opportunities.filter(
    (opp) => !formData.trust_code || opp.trust_code === formData.trust_code
  );

  const TaskCard = ({ task }: { task: Task }) => {
    const isAssignedByOther = task.created_by && task.created_by !== user?.email;
    const isSelected = selectedTaskIds.includes(task.id);

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

    return (
      <Card className={`mb-3 transition-all ${isSelected ? 'ring-2 ring-[#005eb8] border-[#005eb8]' : ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            {/* Selection checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleTaskSelection(task.id)}
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
                    <DropdownMenuItem onClick={() => handleEditTask(task)}>
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

  const TaskSection = ({
    title,
    count,
    tasks,
    variant,
    isOpen,
    onToggle,
    category,
  }: {
    title: string;
    count: number;
    tasks: Task[];
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
    isOpen: boolean;
    onToggle: () => void;
    category: string;
  }) => {
    if (count === 0) return null;

    const displayedTasks = tasks.slice(0, 3);
    const hasMore = tasks.length > 3;

    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <Card className="mb-4">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <Badge variant={variant}>{count}</Badge>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {displayedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {hasMore && (
                <div className="text-center mt-4">
                  <Link
                    href={`/crm/tasks/${category}`}
                    className="text-sm text-[#005eb8] hover:underline font-medium"
                  >
                    Show All {count} Tasks →
                  </Link>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
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
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1">
              {tasks.filter((t) => !t.completed).length} active tasks
            </p>
          </div>

        <div className="flex gap-3">
          <Select value={sortMode} onValueChange={(value: 'dueDate' | 'priority') => setSortMode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Sort by: Due Date</SelectItem>
              <SelectItem value="priority">Sort by: Priority</SelectItem>
            </SelectContent>
          </Select>

          {selectedTaskIds.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleBulkComplete}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete ({selectedTaskIds.length})
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsBulkEditDialogOpen(true)}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit ({selectedTaskIds.length})
              </Button>

              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedTaskIds.length})
              </Button>
            </>
          )}

          <Button
            variant={showCompleted ? 'default' : 'outline'}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {showCompleted ? 'Hide' : 'Show'} Completed
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 [&>button]:text-white [&>button]:hover:text-white/80">
              <DialogHeader className="bg-gradient-to-r from-[#003d7a] to-[#005eb8] border-b border-white/10 px-6 py-5 rounded-t-lg sticky top-0 z-10 backdrop-blur-sm">
                <DialogTitle className="text-2xl text-white font-semibold">{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                <DialogDescription className="text-white/80">
                  {editingTask
                    ? 'Update the task details below'
                    : 'Fill in the details to create a new task'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="task_title">
                    Task Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="task_title"
                    value={formData.task_title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, task_title: e.target.value }))
                    }
                    placeholder="Enter task title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_description">Description</Label>
                  <Textarea
                    id="task_description"
                    value={formData.task_description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, task_description: e.target.value }))
                    }
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trust_code">Trust</Label>
                  <Select
                    value={formData.trust_code}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        trust_code: value,
                        contact_id: '',
                        opportunity_id: '',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trust (optional)" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px]">
                      {trusts.map((trust) => (
                        <SelectItem key={trust.code} value={trust.code}>
                          {trust.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_id">Contact</Label>
                  <Select
                    value={formData.contact_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, contact_id: value }))}
                    disabled={!formData.trust_code}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredContactsForTrust.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opportunity_id">Opportunity</Label>
                  <Select
                    value={formData.opportunity_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, opportunity_id: value }))
                    }
                    disabled={!formData.trust_code}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select opportunity (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredOpportunitiesForTrust.map((opp) => (
                        <SelectItem key={opp.id} value={opp.id}>
                          {opp.opportunity_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">
                    Due Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? (
                          format(formData.due_date, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.due_date}
                        onSelect={(date) => setFormData((prev) => ({ ...prev, due_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'high' | 'medium' | 'low') =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingTask ? handleUpdateTask : handleCreateTask}>
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Edit Dialog */}
          <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 [&>button]:text-white [&>button]:hover:text-white/80">
              <DialogHeader className="bg-gradient-to-r from-[#003d7a] to-[#005eb8] border-b border-white/10 px-6 py-5 rounded-t-lg sticky top-0 z-10 backdrop-blur-sm">
                <DialogTitle className="text-2xl text-white font-semibold">
                  Bulk Edit Tasks ({selectedTaskIds.length} selected)
                </DialogTitle>
                <DialogDescription className="text-white/80">
                  Update the fields below to apply changes to all selected tasks
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="bulk_priority">Priority (optional)</Label>
                  <Select
                    value={bulkEditData.priority || ''}
                    onValueChange={(value: 'high' | 'medium' | 'low' | '') =>
                      setBulkEditData((prev) => ({
                        ...prev,
                        priority: value || undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority (leave blank to skip)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk_due_date">Due Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bulkEditData.due_date ? (
                          format(bulkEditData.due_date, 'PPP')
                        ) : (
                          <span>Pick a date (leave blank to skip)</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bulkEditData.due_date}
                        onSelect={(date) =>
                          setBulkEditData((prev) => ({ ...prev, due_date: date }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk_assigned_to">Assigned To (optional)</Label>
                  <Input
                    id="bulk_assigned_to"
                    type="email"
                    value={bulkEditData.assigned_to || ''}
                    onChange={(e) =>
                      setBulkEditData((prev) => ({ ...prev, assigned_to: e.target.value }))
                    }
                    placeholder="Email address (leave blank to skip)"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Only fields you fill in will be updated. Leave fields
                    blank to keep existing values for each task.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkEditDialogOpen(false);
                    setBulkEditData({});
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkEditSubmit}>
                  Update {selectedTaskIds.length} Task{selectedTaskIds.length > 1 ? 's' : ''}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{kpiOverdue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Due Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#005eb8]">{kpiToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Due This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{kpiThisWeek}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Sections */}
      <div className="space-y-4">
        {sortMode === 'dueDate' ? (
          <>
            <TaskSection
              title="Overdue"
              count={groupedTasks.overdue?.length || 0}
              tasks={groupedTasks.overdue || []}
              variant="destructive"
              isOpen={overdueOpen}
              onToggle={() => setOverdueOpen(!overdueOpen)}
              category="overdue"
            />

            <TaskSection
              title="Today"
              count={groupedTasks.today?.length || 0}
              tasks={groupedTasks.today || []}
              variant="default"
              isOpen={todayOpen}
              onToggle={() => setTodayOpen(!todayOpen)}
              category="today"
            />

            <TaskSection
              title="Tomorrow"
              count={groupedTasks.tomorrow?.length || 0}
              tasks={groupedTasks.tomorrow || []}
              variant="default"
              isOpen={tomorrowOpen}
              onToggle={() => setTomorrowOpen(!tomorrowOpen)}
              category="tomorrow"
            />

            <TaskSection
              title="This Week"
              count={groupedTasks.thisWeek?.length || 0}
              tasks={groupedTasks.thisWeek || []}
              variant="secondary"
              isOpen={thisWeekOpen}
              onToggle={() => setThisWeekOpen(!thisWeekOpen)}
              category="this-week"
            />

            <TaskSection
              title="Later"
              count={groupedTasks.later?.length || 0}
              tasks={groupedTasks.later || []}
              variant="outline"
              isOpen={laterOpen}
              onToggle={() => setLaterOpen(!laterOpen)}
              category="later"
            />
          </>
        ) : (
          <>
            <TaskSection
              title="High Priority"
              count={groupedTasks.high?.length || 0}
              tasks={groupedTasks.high || []}
              variant="destructive"
              isOpen={highOpen}
              onToggle={() => setHighOpen(!highOpen)}
              category="high"
            />

            <TaskSection
              title="Medium Priority"
              count={groupedTasks.medium?.length || 0}
              tasks={groupedTasks.medium || []}
              variant="secondary"
              isOpen={mediumOpen}
              onToggle={() => setMediumOpen(!mediumOpen)}
              category="medium"
            />

            <TaskSection
              title="Low Priority"
              count={groupedTasks.low?.length || 0}
              tasks={groupedTasks.low || []}
              variant="outline"
              isOpen={lowOpen}
              onToggle={() => setLowOpen(!lowOpen)}
              category="low"
            />
          </>
        )}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No tasks yet</h3>
          <p className="text-gray-600 mt-1">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
}
