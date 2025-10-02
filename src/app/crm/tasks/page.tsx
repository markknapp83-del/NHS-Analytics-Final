'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
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
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    task_title: '',
    task_description: '',
    trust_code: '',
    contact_id: '',
    opportunity_id: '',
    due_date: undefined,
    assigned_to: user?.email || '',
  });

  // Section collapse states
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [todayOpen, setTodayOpen] = useState(true);
  const [thisWeekOpen, setThisWeekOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(true);

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
      const response = await fetch('/api/crm/accounts');
      const result = await response.json();
      if (result.data) {
        const trustList = result.data.map((account: any) => ({
          code: account.trust_code,
          name: account.trust_name,
        }));
        setTrusts(trustList);
      }
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
    if (!formData.task_title || !formData.due_date || !formData.assigned_to) {
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
    if (!editingTask || !formData.task_title || !formData.due_date || !formData.assigned_to) {
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

      const result = await response.json();

      if (result.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
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
    });
    setEditingTask(null);
  };

  const categorizeTask = (task: Task) => {
    if (task.completed && !showCompleted) return null;

    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (dueDate < today && !task.completed) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';
    if (dueDate >= tomorrow && dueDate < weekEnd) return 'thisWeek';
    return 'later';
  };

  const groupedTasks = {
    overdue: tasks.filter((t) => categorizeTask(t) === 'overdue'),
    today: tasks.filter((t) => categorizeTask(t) === 'today'),
    thisWeek: tasks.filter((t) => categorizeTask(t) === 'thisWeek'),
    later: tasks.filter((t) => categorizeTask(t) === 'later'),
  };

  const filteredContactsForTrust = contacts.filter(
    (contact) => !formData.trust_code || contact.trust_code === formData.trust_code
  );

  const filteredOpportunitiesForTrust = opportunities.filter(
    (opp) => !formData.trust_code || opp.trust_code === formData.trust_code
  );

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
  }: {
    title: string;
    count: number;
    tasks: Task[];
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
    isOpen: boolean;
    onToggle: () => void;
  }) => {
    if (count === 0) return null;

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
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600 mt-1">
            {tasks.filter((t) => !t.completed).length} active tasks
          </p>
        </div>

        <div className="flex gap-3">
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                <DialogDescription>
                  {editingTask
                    ? 'Update the task details below'
                    : 'Fill in the details to create a new task'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="task_title">
                    Task Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="task_title"
                    value={formData.task_title}
                    onChange={(e) =>
                      setFormData({ ...formData, task_title: e.target.value })
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
                      setFormData({ ...formData, task_description: e.target.value })
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
                      setFormData({
                        ...formData,
                        trust_code: value,
                        contact_id: '',
                        opportunity_id: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trust (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                    onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                    disabled={!formData.trust_code}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                      setFormData({ ...formData, opportunity_id: value })
                    }
                    disabled={!formData.trust_code}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select opportunity (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                        onSelect={(date) => setFormData({ ...formData, due_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">
                    Assign To <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to: e.target.value })
                    }
                    placeholder="Enter email address"
                    type="email"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
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
        </div>
      </div>

      {/* Task Sections */}
      <div className="space-y-4">
        <TaskSection
          title="Overdue"
          count={groupedTasks.overdue.length}
          tasks={groupedTasks.overdue}
          variant="destructive"
          isOpen={overdueOpen}
          onToggle={() => setOverdueOpen(!overdueOpen)}
        />

        <TaskSection
          title="Today"
          count={groupedTasks.today.length}
          tasks={groupedTasks.today}
          variant="default"
          isOpen={todayOpen}
          onToggle={() => setTodayOpen(!todayOpen)}
        />

        <TaskSection
          title="This Week"
          count={groupedTasks.thisWeek.length}
          tasks={groupedTasks.thisWeek}
          variant="secondary"
          isOpen={thisWeekOpen}
          onToggle={() => setThisWeekOpen(!thisWeekOpen)}
        />

        <TaskSection
          title="Later"
          count={groupedTasks.later.length}
          tasks={groupedTasks.later}
          variant="outline"
          isOpen={laterOpen}
          onToggle={() => setLaterOpen(!laterOpen)}
        />
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
