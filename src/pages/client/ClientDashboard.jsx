import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Target,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ClientDashboard() {
  const { tasks, getActiveGroup, getTasksByGroup, getTaskStats, dataReady } = useData();
  const navigate = useNavigate();

  // Get the active group
  const activeGroup = getActiveGroup();

  // Keep page title and routing in sync with active group state
  useEffect(() => {
    // Avoid redirect/title churn until data has hydrated
    if (!dataReady) return;

    if (!activeGroup) {
      navigate('/error', { replace: true });
    } else {
      // Active group – ensure title reflects dashboard, not error state
      document.title = 'Task Dashboard | Task Track';
    }
  }, [activeGroup, navigate, dataReady]);
  
  // Get all tasks from the first public group.
  // If there is no active public group, do not show any tasks to normal users.
  const allTasks = activeGroup ? getTasksByGroup(activeGroup.id) : [];

  const stats = getTaskStats(allTasks);
  
  // Calculate completion rate
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  // Stats cards - solid color backgrounds
  const statsCards = [
    {
      label: 'Total Tasks',
      value: stats.total,
      icon: CheckSquare,
      borderColor: 'border-t-brand-500',
      bgColor: 'bg-brand-50',
      textColor: 'text-brand-600',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: Target,
      borderColor: 'border-t-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      borderColor: 'border-t-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      borderColor: 'border-t-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
  ];

  // Pie chart data
  const pieData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
    { name: 'Pending', value: stats.pending, color: '#6366f1' },
  ].filter(item => item.value > 0);

  // Upcoming tasks (next 7 days)
  const upcomingTasks = allTasks
    .filter(t => t.status !== 'completed' && isAfter(parseISO(t.dueDate), new Date()))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Recently completed
  const recentlyCompleted = allTasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-600 bg-red-100',
      medium: 'text-amber-600 bg-amber-100',
      low: 'text-emerald-600 bg-emerald-100',
    };
    return colors[priority] || colors.medium;
  };

  const getDaysUntilDue = (dueDate) => {
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  // Show a clear loading state instead of a blank screen while data hydrates
  if (!dataReady) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">
            Task Dashboard
          </h1>
            <p className="text-slate-500 mt-1">
              {activeGroup ? `${activeGroup.name} • ` : ''}{format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
        </div>
        <Link to="/tasks" className="btn btn-primary">
          View All Tasks
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div 
            key={stat.label}
            className={`card p-6 border-t-4 ${stat.borderColor} animate-slide-up animate-stagger-${index + 1}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-3xl font-display font-bold text-slate-800 mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Overview Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-slate-800 mb-4">
            Task Overview
          </h2>
          <div className="h-52">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No tasks yet
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-display font-bold text-slate-800">{completionRate}%</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Completion Rate</p>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-slate-800">
              Upcoming Tasks
            </h2>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          
          {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{task.title}</h4>
                    <p className="text-sm text-slate-500 truncate">{task.description || 'No description'}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{getDaysUntilDue(task.dueDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <CheckSquare className="w-10 h-10 mb-3 opacity-50" />
              <p>No upcoming tasks</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recently Completed */}
      <div className="card p-6">
        <h2 className="text-lg font-display font-semibold text-slate-800 mb-4">
          Recently Completed
        </h2>
        {recentlyCompleted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentlyCompleted.map((task) => (
              <div 
                key={task.id}
                className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">{task.title}</h4>
                  <p className="text-xs text-slate-500">
                    Completed {format(parseISO(task.updatedAt), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-400">
            <p>No completed tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
