import * as XLSXModule from 'xlsx';
import { format } from 'date-fns';

// Handle xlsx import - it may export as default or namespace
const XLSX = XLSXModule.default || XLSXModule;

/**
 * Export tasks to Excel format (.xlsx)
 * @param {Array} tasks - Array of task objects
 * @param {Object} options - Export options
 * @param {string} options.groupName - Name of the group
 * @param {string} options.userId - ID of the user requesting export
 * @param {string} options.userName - Name of the user requesting export
 * @param {Array} options.users - Array of user objects to look up assignee information
 */
export function exportTasksToExcel(tasks, options = {}) {
  const { groupName = 'Tasks', userId = 'unknown', userName = 'Unknown User', users = [] } = options;
  
  // Helper function to get user info
  const getUserInfo = (userId) => {
    if (!userId) return { name: 'Unassigned', role: '' };
    const user = users.find(u => u.id === userId);
    if (!user) return { name: 'Unknown', role: '' };
    
    const role = user.jobTitle || (user.role === 'team_leader' ? 'Team Leader' : 'Member');
    return { name: user.fullName || 'Unknown', role };
  };
  
  // Helper function to format priority
  const formatPriority = (priority) => {
    const priorities = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return priorities[priority] || priority || '';
  };
  
  // Helper function to format status
  const formatStatus = (status) => {
    const statuses = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return statuses[status] || status || '';
  };
  
  // Prepare data for Excel - only requested columns
  const exportData = tasks.map(task => {
    const assigneeInfo = getUserInfo(task.assigneeId);
    return {
      'Team Member': assigneeInfo.name,
      'Role': assigneeInfo.role,
      'Task Title': task.title || '',
      'Task Description': task.description || '',
      'Priority': formatPriority(task.priority),
      'Status': formatStatus(task.status),
      'Due Date': task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    };
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 20 }, // Team Member
    { wch: 18 }, // Role
    { wch: 35 }, // Task Title
    { wch: 50 }, // Task Description
    { wch: 12 }, // Priority
    { wch: 15 }, // Status
    { wch: 15 }, // Due Date
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, groupName);
  
  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `tasks_${groupName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
  
  // Write file and trigger download
  XLSX.writeFile(workbook, filename);
  
  return filename;
}

