import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  UserCheck,
  FolderKanban,
  Activity,
  Globe,
  Lock,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

export default function AdminDashboard() {
  const { users, getNormalUsers } = useAuth();
  const { groups, tasks, auditLogs, getTaskStats } = useData();

  const normalUsers = getNormalUsers();
  const stats = getTaskStats();
  
  // Calculate metrics
  const totalUsers = normalUsers.length;
  const totalGroups = groups.length;
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  // Stats cards data - solid color backgrounds
  const statsCards = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      borderColor: 'border-t-brand-500',
      bgColor: 'bg-brand-50',
      textColor: 'text-brand-600',
    },
    {
      label: 'Total Tasks',
      value: stats.total,
      icon: CheckSquare,
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

  // Pie chart data for task status
  const pieData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
    { name: 'Pending', value: stats.pending, color: '#6366f1' },
    { name: 'Overdue', value: stats.overdue, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Bar chart data for tasks per group
  const groupTaskData = groups.map(group => {
    const groupTasks = tasks.filter(t => t.groupId === group.id);
    return {
      name: group.name,
      completed: groupTasks.filter(t => t.status === 'completed').length,
      inProgress: groupTasks.filter(t => t.status === 'in_progress').length,
      pending: groupTasks.filter(t => t.status === 'pending').length,
    };
  });

  // Group visibility statistics
  const publicGroups = groups.filter(g => g.isPublic === true).length;
  const privateGroups = groups.filter(g => g.isPublic === false).length;

  // Activity trend (last 7 days)
  const activityData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayTasks = tasks.filter(t => {
      const taskDate = parseISO(t.createdAt);
      return format(taskDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
    return {
      date: format(date, 'EEE'),
      tasks: dayTasks.length,
    };
  });

  // Recent audit logs
  const recentLogs = auditLogs.slice(0, 5);

  // Get error logs from localStorage
  const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
  const noGroupsErrors = errorLogs.filter(log => log.type === 'NO_GROUPS_ACTIVATED');
  const recentNoGroupsErrors = noGroupsErrors.slice(-5).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Overview of your organization's performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Activity className="w-4 h-4" />
          Last updated: {format(new Date(), 'MMM d, h:mm a')}
        </div>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Pie Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-slate-800 mb-4">
            Task Status Distribution
          </h2>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
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
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No tasks to display
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-emerald-600">{completionRate}%</span> completion rate
            </span>
          </div>
        </div>

        {/* Tasks per Group Bar Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-slate-800 mb-4">
            Tasks by Group
          </h2>
          <div className="h-64">
            {groupTaskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupTaskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-slate-600 text-sm capitalize">{value}</span>}
                  />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No groups to display
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Trend */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-display font-semibold text-slate-800 mb-4">
            Task Creation Trend (7 Days)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tasks" 
                  stroke="#0c8fe7" 
                  strokeWidth={3}
                  dot={{ fill: '#0c8fe7', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#0c8fe7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-slate-800 mb-4">
            Quick Stats
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <FolderKanban className="w-5 h-5 text-brand-600" />
                <span className="text-sm text-slate-600">Total Groups</span>
              </div>
              <span className="font-semibold text-slate-800">{totalGroups}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">Team Leaders</span>
              </div>
              <span className="font-semibold text-slate-800">
                {normalUsers.filter(u => u.role === 'team_leader').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-slate-600">Team Members</span>
              </div>
              <span className="font-semibold text-slate-800">
                {normalUsers.filter(u => u.role === 'client').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">Public Groups</span>
              </div>
              <span className="font-semibold text-slate-800">{publicGroups}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">Private Groups</span>
              </div>
              <span className="font-semibold text-slate-800">{privateGroups}</span>
            </div>
          </div>

          {/* Recent Activity */}
          <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="text-xs p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-slate-700">{log.userName}</span>
                  <span className="text-slate-500"> {log.action.toLowerCase()} </span>
                  <span className="text-slate-600">{log.entityType.toLowerCase()}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Error Notifications Section */}
      {recentNoGroupsErrors.length > 0 && (
        <div className="card p-6 border-l-4 border-l-red-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-display font-semibold text-slate-800 mb-2">
                No Groups Activated Warnings
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                {recentNoGroupsErrors.length} recent occurrence{recentNoGroupsErrors.length !== 1 ? 's' : ''} of users encountering the "No Groups Activated" error.
              </p>
              <div className="space-y-2">
                {recentNoGroupsErrors.map((error, index) => (
                  <div key={index} className="text-xs bg-slate-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-600">
                        {format(parseISO(error.timestamp), 'PPpp')}
                      </span>
                      <span className="text-red-600 font-medium">503 Error</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-500">
                  💡 Tip: Activate at least one group in Group Management to resolve this issue.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
