import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Initial demo groups - empty array for production (groups should come from database)
const initialGroups = [];

// Initial demo tasks - empty array for production (tasks should come from database)
const initialTasks = [];

export function DataProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [toastQueue, setToastQueue] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const { currentUser } = useAuth();

  // Simple toast function for data operations
  const showToast = useCallback((message, type = 'success') => {
    setToastQueue(prev => [...prev, { message, type, id: Date.now() }]);
  }, []);

  // Load data from localStorage (with defensive parsing to avoid perma-loading states)
  useEffect(() => {
    try {
      const storedGroups = localStorage.getItem('tasktrack_groups');
      const storedTasks = localStorage.getItem('tasktrack_tasks');
      const storedLogs = localStorage.getItem('tasktrack_audit_logs');
      
      if (storedGroups) {
        try {
          setGroups(JSON.parse(storedGroups));
        } catch (e) {
          console.error('[DataContext] Failed to parse stored groups, resetting to defaults', e);
          setGroups(initialGroups);
          localStorage.setItem('tasktrack_groups', JSON.stringify(initialGroups));
        }
      } else {
        setGroups(initialGroups);
        localStorage.setItem('tasktrack_groups', JSON.stringify(initialGroups));
      }
      
      if (storedTasks) {
        try {
          setTasks(JSON.parse(storedTasks));
        } catch (e) {
          console.error('[DataContext] Failed to parse stored tasks, resetting to defaults', e);
          setTasks(initialTasks);
          localStorage.setItem('tasktrack_tasks', JSON.stringify(initialTasks));
        }
      } else {
        setTasks(initialTasks);
        localStorage.setItem('tasktrack_tasks', JSON.stringify(initialTasks));
      }
      
      if (storedLogs) {
        try {
          setAuditLogs(JSON.parse(storedLogs));
        } catch (e) {
          console.error('[DataContext] Failed to parse stored audit logs, clearing', e);
          setAuditLogs([]);
          localStorage.removeItem('tasktrack_audit_logs');
        }
      }
    } finally {
      // Always mark data as loaded once initial hydration attempt is done
      setDataReady(true);
    }
  }, []);

  // Sync data to localStorage
  useEffect(() => {
    if (groups.length > 0) {
      localStorage.setItem('tasktrack_groups', JSON.stringify(groups));
    }
  }, [groups]);

  // Periodic sync with localStorage to guarantee that group visibility
  // changes (activation/deactivation) are reflected within a few seconds,
  // even if a storage event is missed.
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        const storedGroups = localStorage.getItem('tasktrack_groups');
        if (!storedGroups) return;

        const parsed = JSON.parse(storedGroups);
        // Only update state if there is an actual difference (avoid unnecessary re-renders)
        const current = JSON.stringify(groups);
        const next = JSON.stringify(parsed);
        if (current !== next) {
          setGroups(parsed);
        }
      } catch (error) {
        // Only log in development to reduce console noise
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to poll groups from localStorage', error);
        }
      }
    }, 4000); // <= 5 seconds as per requirement

    return () => clearInterval(intervalId);
  }, [groups]);

  // Listen for cross-tab/localStorage changes so that when an admin
  // activates or deactivates a group in another tab or window,
  // all open client dashboards see the updated visibility state.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'tasktrack_groups') {
        try {
          const updatedGroups = event.newValue ? JSON.parse(event.newValue) : [];
          setGroups(updatedGroups);
        } catch (error) {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to sync groups from storage event', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('tasktrack_tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tasktrack_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Audit logging helper
  const addAuditLog = (action, entityType, entityId, details) => {
    const log = {
      id: `log-${Date.now()}`,
      action,
      entityType,
      entityId,
      details,
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  // Exposed helper for logging access attempts to deactivated/unavailable groups
  const logDeactivatedGroupAccess = (groupId, details = {}) => {
    addAuditLog('UNAUTHORIZED_GROUP_ACCESS', 'GROUP', groupId || 'unknown', {
      ...details,
      reason: 'GROUP_DEACTIVATED_OR_UNAVAILABLE',
    });
  };

  // Exposed helper for logging task export operations
  const logTaskExport = (taskCount, details = {}) => {
    addAuditLog('EXPORT_TASKS', 'TASK', 'bulk', {
      taskCount,
      exportFormat: 'excel',
      ...details,
    });
  };

  // Group operations
  const createGroup = (groupData) => {
    const existingGroup = groups.find(g => g.name.toLowerCase() === groupData.name.toLowerCase());
    if (existingGroup) {
      showToast('A group with this name already exists', 'error');
      return false;
    }
    
    const newGroup = {
      ...groupData,
      id: `group-${Date.now()}`,
      isPublic: groupData.isPublic !== undefined ? groupData.isPublic : false, // Default to private
      createdAt: new Date().toISOString(),
    };
    
    setGroups(prev => [...prev, newGroup]);
    addAuditLog('CREATE', 'GROUP', newGroup.id, { name: newGroup.name, isPublic: newGroup.isPublic });
    showToast('Group created successfully');
    return newGroup;
  };

  const updateGroup = (groupId, updates) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, ...updates } : g
    ));
    addAuditLog('UPDATE', 'GROUP', groupId, updates);
    showToast('Group updated successfully');
  };

  const deleteGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
    addAuditLog('DELETE', 'GROUP', groupId, { name: group?.name });
    showToast('Group deleted successfully');
    return true;
  };

  const getGroupById = (groupId) => {
    return groups.find(g => g.id === groupId);
  };

  // Get public groups only (for public-facing pages)
  const getPublicGroups = () => {
    return groups.filter(g => g.isPublic === true);
  };

  // Get the single active (public) group, if any
  const getActiveGroup = () => {
    return groups.find(g => g.isPublic === true) || null;
  };

  // Toggle group visibility (admin only)
  // Enforces that at most ONE group can be active (public) at any time
  const toggleGroupVisibility = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      showToast('Group not found', 'error');
      return false;
    }
    
    const newVisibility = !group.isPublic;

    setGroups(prev => prev.map(g => {
      // If activating this group, deactivate all others
      if (newVisibility) {
        if (g.id === groupId) {
          return { ...g, isPublic: true };
        }
        // Deactivate any other active group
        if (g.isPublic) {
          return { ...g, isPublic: false };
        }
        return g;
      }
      
      // If deactivating this group, just set it to false
      if (g.id === groupId) {
        return { ...g, isPublic: false };
      }
      
      return g;
    }));
    
    addAuditLog('TOGGLE_VISIBILITY', 'GROUP', groupId, { 
      name: group.name, 
      previousVisibility: group.isPublic, 
      newVisibility 
    });
    
    showToast(`Group ${newVisibility ? 'activated' : 'deactivated'} successfully`);
    return true;
  };

  // Task operations
  const createTask = (taskData) => {
    const newTask = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdBy: taskData.createdBy || 'public', // Public user identifier
      status: taskData.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setTasks(prev => [...prev, newTask]);
    addAuditLog('CREATE', 'TASK', newTask.id, { 
      title: newTask.title,
      groupId: newTask.groupId,
      priority: newTask.priority,
      status: newTask.status,
      assigneeId: newTask.assigneeId,
      dueDate: newTask.dueDate,
    });
    showToast('Task created successfully');
    return newTask;
  };

  const updateTask = (taskId, updates) => {
    const task = tasks.find(t => t.id === taskId);
    
    // If status is being changed to 'completed', set completedAt timestamp
    // If status is being changed from 'completed' to something else, clear completedAt
    const taskUpdates = { ...updates, updatedAt: new Date().toISOString() };
    
    if (updates.status === 'completed' && task?.status !== 'completed') {
      // Task is being marked as completed - set completion timestamp
      taskUpdates.completedAt = new Date().toISOString();
    } else if (updates.status && updates.status !== 'completed' && task?.status === 'completed') {
      // Task is being changed from completed to another status - clear completion timestamp
      taskUpdates.completedAt = null;
    } else if (task?.completedAt && !updates.status) {
      // Preserve existing completedAt if status is not being changed
      taskUpdates.completedAt = task.completedAt;
    }
    
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...taskUpdates } : t
    ));
    addAuditLog('UPDATE', 'TASK', taskId, { 
      ...updates,
      previousTitle: task?.title,
      previousStatus: task?.status,
      previousPriority: task?.priority,
    });
    showToast('Task updated successfully');
  };

  const deleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    addAuditLog('DELETE', 'TASK', taskId, { title: task?.title });
    showToast('Task deleted successfully');
    return true;
  };

  const getTaskById = (taskId) => {
    return tasks.find(t => t.id === taskId);
  };

  const getTasksByGroup = (groupId) => {
    return tasks.filter(t => t.groupId === groupId);
  };

  const getTasksByAssignee = (userId) => {
    return tasks.filter(t => t.assigneeId === userId);
  };

  const getTasksByCreator = (userId) => {
    return tasks.filter(t => t.createdBy === userId);
  };

  // Stats helpers
  const getTaskStats = (filteredTasks = tasks) => {
    const now = new Date();
    return {
      total: filteredTasks.length,
      completed: filteredTasks.filter(t => t.status === 'completed').length,
      inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
      pending: filteredTasks.filter(t => t.status === 'pending').length,
      overdue: filteredTasks.filter(t => 
        t.status !== 'completed' && new Date(t.dueDate) < now
      ).length,
    };
  };

  const value = {
    groups,
    dataReady,
    getPublicGroups,
    getActiveGroup,
    tasks,
    auditLogs,
    createGroup,
    updateGroup,
    deleteGroup,
    toggleGroupVisibility,
    getGroupById,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByGroup,
    getTasksByAssignee,
    getTasksByCreator,
    getTaskStats,
    toastQueue,
    setToastQueue,
    logDeactivatedGroupAccess,
    logTaskExport,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
