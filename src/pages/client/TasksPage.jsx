import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import { 
  Plus, 
  Search, 
  Filter,
  CheckSquare,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
  Calendar,
  User,
  Flag,
  X,
  Users,
  UserPlus,
  Download,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import Modal from '../../components/Modal';
import { format, parseISO, isBefore } from 'date-fns';
import { exportTasksToExcel } from '../../utils/excelExport';

export default function TasksPage() {
  const { getUsersByGroup, users, updateUser, deleteUser, register, currentUser, isAdmin } = useAuth();
  const { 
    tasks, 
    getActiveGroup,
    dataReady,
    createTask, 
    updateTask, 
    deleteTask, 
    getTasksByGroup, 
    getTasksByAssignee,
    getGroupById,
    logTaskExport
  } = useData();
  const navigate = useNavigate();

  // Get the active group
  const activeGroup = getActiveGroup();
  const groupMembers = activeGroup ? getUsersByGroup(activeGroup.id) : [];

  // Keep page title and routing in sync with active group state
  useEffect(() => {
    // Avoid redirect/title churn until data has hydrated
    if (!dataReady) return;

    if (!activeGroup) {
      // No active public group – send user to error page
      navigate('/error', { replace: true });
    } else {
      document.title = 'Tasks & Team | Task Track';
    }
  }, [activeGroup, navigate, dataReady]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'add', 'delete', 'edit', 'deleteTask', or 'download'
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);
  const [pendingEditUser, setPendingEditUser] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showFilters, setShowFilters] = useState(false);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    priority: 'medium',
  });
  const [userForm, setUserForm] = useState({
    fullName: '',
    jobTitle: '',
  });
  // New user form for adding users
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    role: '',
    customRole: '',
    useCustomRole: false,
  });
  const [formErrors, setFormErrors] = useState({});

  // Predefined roles for selection
  const predefinedRoles = [
    { value: '', label: 'Not Set' },
    { value: 'developer', label: 'Developer' },
    { value: 'designer', label: 'Designer' },
    { value: 'analyst', label: 'Analyst' },
    { value: 'manager', label: 'Manager' },
    { value: 'tester', label: 'Tester' },
    { value: 'custom', label: 'Enter Custom Role...' },
  ];

  // Get all tasks from the active group.
  // If there is no active public group, do not show any tasks to normal users.
  const relevantTasks = useMemo(() => {
    if (activeGroup) {
      return getTasksByGroup(activeGroup.id);
    }
    return [];
  }, [activeGroup, getTasksByGroup]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return relevantTasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter logic with auto-hide for completed tasks
      let matchesStatus = false;
      if (statusFilter === 'all') {
        // When showing all tasks, hide completed tasks that are older than 1 minutes
        if (task.status === 'completed') {
          // If task has completedAt timestamp, check if it's within 1 minutes
          if (task.completedAt) {
            const completedTime = new Date(task.completedAt).getTime();
            const now = new Date().getTime();
            const minutesSinceCompletion = (now - completedTime) / (1000 * 60);
            // Show completed tasks only if they were completed less than 1 minutes ago
            matchesStatus = minutesSinceCompletion < 1;
          } else {
            // For backward compatibility: if completedAt is missing, show the task
            // (old completed tasks without timestamp will remain visible)
            matchesStatus = true;
          }
        } else {
          // Show all non-completed tasks
          matchesStatus = true;
        }
      } else {
        // When filter is set to a specific status, show all tasks with that status
        matchesStatus = task.status === statusFilter;
      }
      
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || 
        (assigneeFilter === 'unassigned' && !task.assigneeId) ||
        task.assigneeId === assigneeFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [relevantTasks, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // Check if there's already a team leader in the group
  const hasTeamLeader = groupMembers.some(member => member.role === 'team_leader');

  // Task form handlers
  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        assigneeId: task.assigneeId || '',
        dueDate: task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
        priority: task.priority,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
        priority: 'medium',
      });
    }
    setFormErrors({});
    setShowTaskModal(true);
  };

  const validateTaskForm = () => {
    const errors = {};
    if (!taskForm.title.trim()) errors.title = 'Title is required';
    if (!taskForm.dueDate) errors.dueDate = 'Due date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!validateTaskForm()) return;

    // Only allow task creation for public groups
    if (!activeGroup || !activeGroup.isPublic) {
      setFormErrors({ title: 'No active group available for task creation' });
      return;
    }

    const taskData = {
      ...taskForm,
      groupId: activeGroup.id,
      dueDate: new Date(taskForm.dueDate).toISOString(),
      assigneeId: taskForm.assigneeId || null,
      createdBy: 'public', // Public user identifier
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      createTask(taskData);
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    // Check if user is admin - if not, require password
    if (!isAdmin) {
      setPendingAction('deleteTask');
      setPendingDeleteTaskId(taskId);
      setShowPasswordModal(true);
      return;
    }

    // Admin user - proceed directly
    deleteTask(taskId);
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  // User management
  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        fullName: user.fullName,
        jobTitle: user.jobTitle || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({ fullName: '', jobTitle: '' });
    }
    setFormErrors({});
    setShowUserModal(true);
  };

  // Open Add New User Modal
  const openAddUserModal = () => {
    setNewUserForm({
      fullName: '',
      role: '',
      customRole: '',
      useCustomRole: false,
    });
    setFormErrors({});
    setShowAddUserModal(true);
  };

  const validateUserForm = () => {
    const errors = {};
    if (!userForm.fullName.trim()) errors.fullName = 'Name is required';
    
    // Prevent assigning Team Leader role if one already exists
    if (userForm.jobTitle && userForm.jobTitle.trim() !== '') {
      const teamLeaderVariations = ['team leader', 'teamleader', 'team-leader', 'team_leader', 'leader'];
      const isTeamLeaderRole = teamLeaderVariations.some(variation => 
        userForm.jobTitle.toLowerCase().includes(variation)
      );
      
      // Only block if there's already a team leader AND the user being edited is not currently a team leader
      if (isTeamLeaderRole && hasTeamLeader && (!editingUser || editingUser.role !== 'team_leader')) {
        errors.jobTitle = 'Team Leader role cannot be assigned. A Team Leader already exists in this group.';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateNewUserForm = () => {
    const errors = {};
    if (!newUserForm.fullName.trim()) errors.fullName = 'Full name is required';
    if (newUserForm.useCustomRole && !newUserForm.customRole.trim()) {
      errors.customRole = 'Please enter a custom role';
    }
    
    // Prevent creating Team Leader role only if one already exists
    const jobTitle = newUserForm.useCustomRole 
      ? newUserForm.customRole.trim()
      : (newUserForm.role === '' ? 'Not Set' : predefinedRoles.find(r => r.value === newUserForm.role)?.label || newUserForm.role);
    
    const teamLeaderVariations = ['team leader', 'teamleader', 'team-leader', 'team_leader', 'leader'];
    const isTeamLeaderRole = teamLeaderVariations.some(variation => 
      jobTitle.toLowerCase().includes(variation)
    );
    
    // Only block if there's already a team leader AND user is trying to assign team leader role
    if (isTeamLeaderRole && hasTeamLeader) {
      if (newUserForm.useCustomRole) {
        errors.customRole = 'Team Leader role cannot be assigned. Only one Team Leader per group is allowed.';
      } else {
        errors.role = 'Team Leader role cannot be assigned. Only one Team Leader per group is allowed.';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Proceed with updating user after password verification
  const proceedWithUpdateUser = () => {
    if (!editingUser) return;

    const updates = { ...userForm };
    
    // Check for team leader role restriction
    if (updates.jobTitle && updates.jobTitle.trim() !== '') {
      const teamLeaderVariations = ['team leader', 'teamleader', 'team-leader', 'team_leader', 'leader'];
      const isTeamLeaderRole = teamLeaderVariations.some(variation => 
        updates.jobTitle.toLowerCase().includes(variation)
      );
      
      if (isTeamLeaderRole && editingUser.role !== 'team_leader' && hasTeamLeader) {
        setFormErrors({ jobTitle: 'Team Leader role cannot be assigned. A Team Leader already exists in this group.' });
        return;
      }
    }
    
    updateUser(editingUser.id, updates);
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    if (editingUser) {
      // Check if user is admin - if not, require password
      if (!isAdmin) {
        setPendingAction('edit');
        setPendingEditUser(editingUser);
        setShowPasswordModal(true);
        return;
      }

      // Admin user - proceed directly
      proceedWithUpdateUser();
    } else {
      setShowUserModal(false);
    }
  };

  // Verify authorization password - use primary admin password
  const verifyAdminPassword = (password) => {
    // Find primary admin user and check if password matches
    const primaryAdmin = users.find(u => u.isAdminUser && u.isPrimary);
    if (primaryAdmin && primaryAdmin.password === password) {
      return true;
    }
    return false;
  };

  // Handle password verification
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!adminPassword.trim()) {
      setPasswordError('Password is required');
      return;
    }

    if (!verifyAdminPassword(adminPassword)) {
      setPasswordError('Invalid authorization password');
      return;
    }

    // Password verified, proceed with pending action
    setShowPasswordModal(false);
    setAdminPassword('');
    
    if (pendingAction === 'add') {
      proceedWithAddUser();
    } else if (pendingAction === 'delete' && pendingDeleteUserId) {
      proceedWithDeleteUser(pendingDeleteUserId);
    } else if (pendingAction === 'deleteTask' && pendingDeleteTaskId) {
      deleteTask(pendingDeleteTaskId);
    } else if (pendingAction === 'edit' && pendingEditUser) {
      proceedWithUpdateUser();
    } else if (pendingAction === 'download') {
      proceedWithExport();
    }
    
    setPendingAction(null);
    setPendingDeleteUserId(null);
    setPendingDeleteTaskId(null);
    setPendingEditUser(null);
  };

  // Proceed with adding user after password verification
  const proceedWithAddUser = async () => {
    // Determine the job title/role
    const jobTitle = newUserForm.useCustomRole 
      ? newUserForm.customRole.trim()
      : (newUserForm.role === '' ? 'Not Set' : predefinedRoles.find(r => r.value === newUserForm.role)?.label || newUserForm.role);

    // Only allow user creation for public groups
    if (!activeGroup || !activeGroup.isPublic) {
      setFormErrors({ fullName: 'No active group available for user creation' });
      return;
    }

    // Create new user without email (password will be auto-generated by API)
    const newUser = await register({
      fullName: newUserForm.fullName.trim(),
      groupId: activeGroup.id,
      role: 'client', // System role - always client
      jobTitle: jobTitle, // Display role/job title
    }, false);

    if (newUser) {
      setShowAddUserModal(false);
      setNewUserForm({
        fullName: '',
        role: '',
        customRole: '',
        useCustomRole: false,
      });
    }
  };

  // Handle Add New User Submit
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!validateNewUserForm()) return;

    // Determine the job title/role
    const jobTitle = newUserForm.useCustomRole 
      ? newUserForm.customRole.trim()
      : (newUserForm.role === '' ? 'Not Set' : predefinedRoles.find(r => r.value === newUserForm.role)?.label || newUserForm.role);

    // Double-check: Prevent creating Team Leader role only if one already exists
    const teamLeaderVariations = ['team leader', 'teamleader', 'team-leader', 'team_leader', 'leader'];
    const isTeamLeaderRole = teamLeaderVariations.some(variation => 
      jobTitle.toLowerCase().includes(variation)
    );
    
    // Only block if there's already a team leader AND user is trying to assign team leader role
    if (isTeamLeaderRole && hasTeamLeader) {
      setFormErrors({ 
        role: 'Team Leader role cannot be assigned. Only one Team Leader per group is allowed.',
        ...(newUserForm.useCustomRole && { customRole: 'Team Leader role cannot be assigned. Only one Team Leader per group is allowed.' })
      });
      return;
    }

    // Check if user is admin - if not, require password
    if (!isAdmin) {
      setPendingAction('add');
      setShowPasswordModal(true);
      return;
    }

    // Admin user - proceed directly
    proceedWithAddUser();
  };

  // Proceed with deleting user after password verification
  const proceedWithDeleteUser = (userId) => {
    updateUser(userId, { groupId: null, role: 'client' });
  };

  const handleDeleteUser = (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the team?')) {
      return;
    }

    // Check if user is admin - if not, require password
    if (!isAdmin) {
      setPendingAction('delete');
      setPendingDeleteUserId(userId);
      setShowPasswordModal(true);
      return;
    }

    // Admin user - proceed directly
    proceedWithDeleteUser(userId);
  };

  const handleRoleChange = (value) => {
    if (value === 'custom') {
      setNewUserForm({ ...newUserForm, role: value, useCustomRole: true });
    } else {
      setNewUserForm({ ...newUserForm, role: value, useCustomRole: false, customRole: '' });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: 'Completed', className: 'badge-success', icon: CheckSquare },
      in_progress: { label: 'In Progress', className: 'badge-warning', icon: Clock },
      pending: { label: 'Pending', className: 'badge-info', icon: Clock },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`badge ${badge.className} flex items-center gap-1`}>
        <badge.icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { label: 'High', className: 'text-red-600 bg-red-100' },
      medium: { label: 'Medium', className: 'text-amber-600 bg-amber-100' },
      low: { label: 'Low', className: 'text-emerald-600 bg-emerald-100' },
    };
    const badge = badges[priority] || badges.medium;
    return (
      <span className={`badge ${badge.className}`}>
        <Flag className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const isOverdue = (task) => {
    return task.status !== 'completed' && isBefore(parseISO(task.dueDate), new Date());
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.fullName || 'Unknown';
  };

  const getJobTitle = (member) => {
    return member.jobTitle || (member.role === 'team_leader' ? 'Team Leader' : 'Member');
  };

  // Proceed with Excel export after password verification
  const proceedWithExport = () => {
    try {
      if (filteredTasks.length === 0) {
        alert('No tasks to download');
        return;
      }

      const filename = exportTasksToExcel(filteredTasks, {
        groupName: activeGroup?.name || 'Tasks',
        userId: currentUser?.id || 'public',
        userName: currentUser?.fullName || 'Public User',
        users: users, // Pass users array to look up assignee information
      });

      // Log export to audit trail
      logTaskExport(filteredTasks.length, {
        groupName: activeGroup?.name,
        filename,
        exportType: 'excel',
      });

      // Show success message
      alert(`Task tracking downloaded successfully! File: ${filename}`);
    } catch (error) {
      // Log error only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Export failed:', error);
      }
      alert('Failed to download task tracking. Please try again.');
    }
  };

  // Handle Excel export
  const handleExportToExcel = () => {
    if (filteredTasks.length === 0) {
      alert('No tasks to download');
      return;
    }

    // Check if user is admin - if not, require password
    if (!isAdmin) {
      setPendingAction('download');
      setShowPasswordModal(true);
      return;
    }

    // Admin user - proceed directly
    proceedWithExport();
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
            Task & Team Management
          </h1>
          <p className="text-slate-500 mt-1">
            {activeGroup ? `${activeGroup.name} • ` : ''}{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportToExcel} 
            className="btn btn-secondary"
            disabled={filteredTasks.length === 0}
            title="Download task tracking"
          >
            <Download className="w-5 h-5" />
            Download task tracking
          </button>
          <button onClick={() => openTaskModal()} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tasks
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'team'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Members
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Filter className="w-5 h-5" />
              Filters
              {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
                <span className="w-2 h-2 bg-brand-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="card p-4 flex flex-wrap gap-4 animate-slide-down">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Status:</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed (All)</option>
                </select>
              </div>
              {statusFilter === 'all' && (
                <div className="w-full flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Auto-hide:</span> Completed tasks automatically disappear from the list after 1 minutes. Use the "Completed" filter to view all completed tasks.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Priority:</label>
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="select py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Assignee:</label>
                <select 
                  value={assigneeFilter} 
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="select py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned</option>
                  {groupMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </div>
              {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
                <button 
                  onClick={() => { 
                    setStatusFilter('all'); 
                    setPriorityFilter('all'); 
                    setAssigneeFilter('all');
                  }}
                  className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Task List */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="card p-12 text-center">
                <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">No tasks found</h3>
                <p className="text-slate-400 mt-1">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first task to get started'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div 
                  key={task.id}
                  className={`card p-5 hover:shadow-lg transition-all ${
                    isOverdue(task) ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Calendar className="w-4 h-4" />
                              <span className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
                                {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                              </span>
                              {isOverdue(task) && (
                                <span className="text-red-500 text-xs font-medium">(Overdue)</span>
                              )}
                            </div>
                            {task.assigneeId && (
                              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                <User className="w-4 h-4" />
                                <span>{getUserName(task.assigneeId)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                      
                      {/* Status Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="select py-2 text-sm w-auto"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      {/* Edit Button */}
                      <button
                        onClick={() => openTaskModal(task)}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <>
          {/* Add New User Button */}
          <div className="flex justify-end">
            <button onClick={openAddUserModal} className="btn btn-primary">
              <UserPlus className="w-5 h-5" />
              Add New User
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Team Member
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tasks
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No team members yet</p>
                        <p className="text-sm text-slate-400 mt-1">Add your first team member to get started</p>
                      </td>
                    </tr>
                  ) : (
                    groupMembers.map((member) => {
                      const memberTasks = getTasksByAssignee(member.id);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                member.role === 'team_leader'
                                  ? 'bg-amber-600'
                                  : 'bg-brand-600'
                              }`}>
                                {member.fullName.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-800">{member.fullName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`badge ${
                              member.role === 'team_leader' ? 'badge-warning' : 'badge-info'
                            }`}>
                              {getJobTitle(member)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openUserModal(member)}
                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(member.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleTaskSubmit} className="space-y-5">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className={`input ${formErrors.title ? 'border-red-500' : ''}`}
              placeholder="Enter task title"
            />
            {formErrors.title && <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="input min-h-[100px] resize-none"
              placeholder="Enter task description (optional)"
            />
          </div>

          <div>
            <label className="label">Assignee</label>
            <select
              value={taskForm.assigneeId}
              onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
              className="select"
            >
              <option value="">Select assignee</option>
              {groupMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.fullName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date *</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className={`input ${formErrors.dueDate ? 'border-red-500' : ''}`}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {formErrors.dueDate && <p className="text-sm text-red-500 mt-1">{formErrors.dueDate}</p>}
            </div>

            <div>
              <label className="label">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="select"
              >
                <option value="high">High / Mandatory</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Edit Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Edit Team Member"
      >
        <form onSubmit={handleUserSubmit} className="space-y-5">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={userForm.fullName}
              onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              className={`input ${formErrors.fullName ? 'border-red-500' : ''}`}
            />
            {formErrors.fullName && <p className="text-sm text-red-500 mt-1">{formErrors.fullName}</p>}
          </div>

          <div>
            <label className="label">Job Title / Role</label>
            <input
              type="text"
              value={userForm.jobTitle || ''}
              onChange={(e) => {
                setUserForm({ ...userForm, jobTitle: e.target.value });
                // Clear error when user types
                if (formErrors.jobTitle) {
                  setFormErrors({ ...formErrors, jobTitle: undefined });
                }
              }}
              className={`input ${formErrors.jobTitle ? 'border-red-500' : ''}`}
              placeholder="e.g., Developer, Designer, Analyst..."
            />
            {formErrors.jobTitle && <p className="text-sm text-red-500 mt-1">{formErrors.jobTitle}</p>}
            {!formErrors.jobTitle && <p className="text-xs text-slate-500 mt-1">Enter the team member's role or job title</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Update Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Add New User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add New User"
      >
        <form onSubmit={handleAddUserSubmit} className="space-y-5">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={newUserForm.fullName}
              onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
              className={`input ${formErrors.fullName ? 'border-red-500' : ''}`}
              placeholder="Enter full name"
            />
            {formErrors.fullName && <p className="text-sm text-red-500 mt-1">{formErrors.fullName}</p>}
          </div>

          <div>
            <label className="label">Role Selection</label>
            <select
              value={newUserForm.role}
              onChange={(e) => {
                handleRoleChange(e.target.value);
                // Clear role error when selection changes
                if (formErrors.role) {
                  setFormErrors({ ...formErrors, role: undefined });
                }
              }}
              className={`select ${formErrors.role && !newUserForm.useCustomRole ? 'border-red-500' : ''}`}
            >
              {predefinedRoles.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {formErrors.role && !newUserForm.useCustomRole && (
              <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>
            )}
            {!formErrors.role && <p className="text-xs text-slate-500 mt-1">Select a predefined role or choose "Enter Custom Role"</p>}
          </div>

          {/* Custom Role Input - shown when "Enter Custom Role..." is selected */}
          {newUserForm.useCustomRole && (
            <div className="animate-slide-down">
              <label className="label">Custom Role *</label>
              <input
                type="text"
                value={newUserForm.customRole}
                onChange={(e) => {
                  setNewUserForm({ ...newUserForm, customRole: e.target.value });
                  // Clear error when user types
                  if (formErrors.customRole || formErrors.role) {
                    setFormErrors({ ...formErrors, customRole: undefined, role: undefined });
                  }
                }}
                className={`input ${formErrors.customRole || formErrors.role ? 'border-red-500' : ''}`}
                placeholder="Enter custom role (e.g., Senior Developer, UI/UX Lead...)"
                autoFocus
              />
              {(formErrors.customRole || formErrors.role) && (
                <p className="text-sm text-red-500 mt-1">{formErrors.customRole || formErrors.role}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowAddUserModal(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </form>
      </Modal>

      {/* Authorization Verification Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setAdminPassword('');
          setPasswordError('');
          setPendingAction(null);
          setPendingDeleteUserId(null);
          setPendingDeleteTaskId(null);
          setPendingEditUser(null);
        }}
        title="Authorization Required"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              This action requires security verification.
            </p>
          </div>

          <div>
            <label className="label">Authorization Password *</label>
            <div className="relative">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setPasswordError('');
                }}
                className={`input pr-10 ${passwordError ? 'border-red-500' : ''}`}
                placeholder="Enter authorization password"
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {passwordError}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowPasswordModal(false);
                setAdminPassword('');
                setPasswordError('');
                setPendingAction(null);
                setPendingDeleteUserId(null);
                setPendingDeleteTaskId(null);
                setPendingEditUser(null);
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              <Lock className="w-4 h-4" />
              Verify
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
