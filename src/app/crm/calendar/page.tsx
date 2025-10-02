'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import Link from 'next/link';

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

interface Activity {
  id: string;
  trust_code: string;
  contact_id: string | null;
  opportunity_id: string | null;
  activity_type: string;
  activity_date: string;
  notes: string | null;
  created_by: string;
  trust_name?: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'day'>('month');

  useEffect(() => {
    if (user?.email) {
      fetchData();
    }
  }, [user?.email, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchActivities()]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
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

            // Fetch trust name if available
            if (task.trust_code) {
              try {
                const trustResponse = await fetch(`/api/crm/accounts/${task.trust_code}`);
                const trustResult = await trustResponse.json();
                if (trustResult.data) {
                  details.trust_name = trustResult.data.trust_name;
                }
              } catch (error) {
                console.error(`Error fetching trust ${task.trust_code}:`, error);
              }
            }

            return details;
          })
        );

        setTasks(tasksWithDetails);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams({
        created_by: user?.email || '',
      });

      const response = await fetch(`/api/crm/activities?${params}`);
      const result = await response.json();

      if (result.data) {
        setActivities(result.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, date);
    });
  };

  const getActivitiesForDate = (date: Date) => {
    return activities.filter((activity) => {
      const activityDate = parseISO(activity.activity_date);
      return isSameDay(activityDate, date);
    });
  };

  const hasEventsOnDate = (date: Date) => {
    const tasksOnDate = getTasksForDate(date);
    const activitiesOnDate = getActivitiesForDate(date);
    return tasksOnDate.length > 0 || activitiesOnDate.length > 0;
  };

  const selectedDateTasks = getTasksForDate(selectedDate);
  const selectedDateActivities = getActivitiesForDate(selectedDate);

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = new Date(task.due_date) < new Date() && !task.completed;

    return (
      <Card className={`mb-3 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="pt-1">
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className={`h-5 w-5 ${isOverdue ? 'text-red-600' : 'text-gray-400'}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold ${
                  task.completed ? 'line-through text-gray-500' : 'text-gray-900'
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
                    href={`/crm/trusts/${task.trust_code}`}
                    className="inline-flex items-center gap-1 text-xs text-[#005eb8] hover:underline"
                  >
                    <Building2 className="h-3 w-3" />
                    {task.trust_name}
                  </Link>
                )}

                {task.assigned_to !== user?.email && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {task.assigned_to}
                  </Badge>
                )}

                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ActivityCard = ({ activity }: { activity: Activity }) => {
    const getActivityIcon = (type: string) => {
      switch (type) {
        case 'call':
          return '📞';
        case 'meeting':
          return '🤝';
        case 'email':
          return '✉️';
        default:
          return '📝';
      }
    };

    return (
      <Card className="mb-3">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {activity.activity_type}
                </Badge>
                <span className="text-xs text-gray-500">
                  {format(parseISO(activity.activity_date), 'h:mm a')}
                </span>
              </div>

              {activity.notes && (
                <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
              )}

              {activity.trust_name && (
                <div className="mt-2">
                  <Link
                    href={`/crm/trusts/${activity.trust_code}`}
                    className="inline-flex items-center gap-1 text-xs text-[#005eb8] hover:underline"
                  >
                    <Building2 className="h-3 w-3" />
                    {activity.trust_name}
                  </Link>
                </div>
              )}
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
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">View your tasks and activities</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            onClick={() => setView('month')}
            size="sm"
          >
            Month
          </Button>
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            onClick={() => setView('day')}
            size="sm"
          >
            Day
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 overflow-hidden">
          {/* Custom Calendar Header */}
          <div className="bg-gradient-to-r from-[#003d7a] to-[#005eb8] border-b border-white/10 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  if (view === 'month') {
                    newDate.setMonth(newDate.getMonth() - 1);
                  } else {
                    newDate.setDate(newDate.getDate() - 1);
                  }
                  setSelectedDate(newDate);
                }}
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <h2 className="text-2xl font-semibold text-white">
                {view === 'month'
                  ? format(selectedDate, 'MMMM yyyy')
                  : format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  if (view === 'month') {
                    newDate.setMonth(newDate.getMonth() + 1);
                  } else {
                    newDate.setDate(newDate.getDate() + 1);
                  }
                  setSelectedDate(newDate);
                }}
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <CardContent className="pt-6">
            {view === 'month' ? (
              <>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border w-full"
                  modifiers={{
                    hasEvents: (date) => hasEventsOnDate(date),
                  }}
                  modifiersStyles={{
                    hasEvents: {
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                    },
                  }}
                />

                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#005eb8]"></div>
                    <span>Has events</span>
                  </div>
                </div>
              </>
            ) : (
              // Day View
              <div className="border rounded-md">
                <div className="divide-y">
                  {Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => {
                    const hourTasks = selectedDateTasks.filter((task) => {
                      if (!task.due_date) return false;
                      const taskHour = new Date(task.due_date).getHours();
                      return taskHour === hour || (taskHour === 0 && hour === 9); // Default to 9 AM if no time
                    });

                    const hourActivities = selectedDateActivities.filter((activity) => {
                      const activityHour = new Date(activity.activity_date).getHours();
                      return activityHour === hour || (activityHour === 0 && hour === 9);
                    });

                    return (
                      <div key={hour} className="flex min-h-[80px]">
                        {/* Time Column */}
                        <div className="w-20 flex-shrink-0 p-3 text-sm text-gray-500 font-medium border-r">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>

                        {/* Events Column */}
                        <div className="flex-1 p-2 space-y-2">
                          {hourTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-2 rounded border-l-4 text-sm ${
                                task.completed
                                  ? 'bg-green-50 border-green-500'
                                  : new Date(task.due_date) < new Date()
                                  ? 'bg-red-50 border-red-500'
                                  : 'bg-blue-50 border-blue-500'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {task.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                ) : (
                                  <Clock className="h-4 w-4 text-gray-600 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {task.task_title}
                                  </p>
                                  {task.trust_name && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      <Building2 className="h-3 w-3 inline mr-1" />
                                      {task.trust_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {hourActivities.map((activity) => (
                            <div
                              key={activity.id}
                              className="p-2 rounded border-l-4 border-purple-500 bg-purple-50 text-sm"
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">
                                  {activity.activity_type === 'call' ? '📞' :
                                   activity.activity_type === 'meeting' ? '🤝' :
                                   activity.activity_type === 'email' ? '✉️' : '📝'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {activity.activity_type}
                                    </Badge>
                                  </div>
                                  {activity.notes && (
                                    <p className="text-xs text-gray-600 mt-1">{activity.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {hourTasks.length === 0 && hourActivities.length === 0 && (
                            <div className="text-xs text-gray-400 py-2"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, 'EEEE, MMMM d')}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {selectedDateTasks.length} tasks, {selectedDateActivities.length} activities
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Navigation Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="flex-1"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Tasks Section */}
            {selectedDateTasks.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tasks ({selectedDateTasks.length})
                </h3>
                <div className="space-y-2">
                  {selectedDateTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Activities Section */}
            {selectedDateActivities.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Activities ({selectedDateActivities.length})
                </h3>
                <div className="space-y-2">
                  {selectedDateActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {selectedDateTasks.length === 0 && selectedDateActivities.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No events on this date</p>
                <div className="mt-4 space-y-2">
                  <Link href="/crm/tasks">
                    <Button variant="outline" size="sm" className="w-full">
                      Create Task
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    tasks.filter((task) => {
                      const taskDate = parseISO(task.due_date);
                      return (
                        taskDate >= startOfMonth(selectedDate) &&
                        taskDate <= endOfMonth(selectedDate)
                      );
                    }).length
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-[#005eb8]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Tasks</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter((task) => task.completed).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    tasks.filter(
                      (task) => new Date(task.due_date) < new Date() && !task.completed
                    ).length
                  }
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
