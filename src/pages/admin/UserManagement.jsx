import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  Search, 
  User,
  Users,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  FolderKanban,
  Calendar,
  CheckSquare,
  X,
  UserPlus,
  Lock,
  AlertTriangle
} from 'lucide-react';
import Modal from '../../components/Modal';
import { format, parseISO } from 'date-fns';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function UserManagement() {
  const { users, getNormalUsers, updateUser, deleteUser, register, getPrimaryAdmin, currentUser } = useAuth();
  const { groups, tasks, getTasksByAssignee, getGroupById } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'team_leader', 'client'
  const [groupFilter, setGroupFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [userForm, setUserForm] = useState({
    fullName: '',
    jobTitle: '',
    groupId: '',
    role: 'client',
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Password protection state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'add' or 'delete'
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null);

  // Get only normal users (not admin users)
  const normalUsers = getNormalUsers();

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return normalUsers.filter(user => {
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = 
        roleFilter === 'all' || 
        user.role === roleFilter;
      
      const matchesGroup = 
        groupFilter === 'all' ||
        (groupFilter === 'unassigned' && !user.groupId) ||
        user.groupId === groupFilter;
      
      return matchesSearch && matchesRole && matchesGroup;
    });
  }, [normalUsers, searchQuery, roleFilter, groupFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset pagination when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, groupFilter]);

  // Get unique groups for filter
  const availableGroups = useMemo(() => {
    return groups.filter(g => normalUsers.some(u => u.groupId === g.id));
  }, [groups, normalUsers]);

  // Open user profile modal
  const openProfileModal = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  // Open edit modal
  const openEditModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setUserForm({
        fullName: user.fullName,
        jobTitle: user.jobTitle || '',
        groupId: user.groupId || '',
        role: user.role || 'client',
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        fullName: '',
        jobTitle: '',
        groupId: '',
        role: 'client',
      });
    }
    setFormErrors({});
    setShowEditModal(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!userForm.fullName.trim()) errors.fullName = 'Name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Verify authorization password - use current logged-in admin's password
  const verifyAdminPassword = (password) => {
    // Check against current logged-in admin user's password
    if (currentUser && currentUser.isAdminUser && currentUser.password === password) {
      return true;
    }
    // Fallback to primary admin password if current user doesn't have password
    const primaryAdmin = getPrimaryAdmin();
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
    }
    
    setPendingAction(null);
    setPendingDeleteUserId(null);
  };
  
  // Proceed with adding user after password verification
  const proceedWithAddUser = async () => {
    setIsLoading(true);
    try {
      const newUser = await register({
        fullName: userForm.fullName.trim(),
        email: null, // No email for normal users
        password: `temp_${Math.random().toString(36).slice(2, 10)}`, // Auto-generate password
        role: userForm.role,
        groupId: userForm.groupId || null,
        jobTitle: userForm.jobTitle || null,
      }, false);
      
      if (newUser) {
        setUserForm({ 
          fullName: '', 
          jobTitle: '', 
          groupId: '', 
          role: 'client' 
        });
        setShowEditModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error adding user:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Proceed with deleting user after password verification
  const proceedWithDeleteUser = async (userId) => {
    setIsLoading(true);
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user update/create
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (selectedUser) {
      // Update existing user - no password required for updates
      setIsLoading(true);
      try {
        const updates = {
          fullName: userForm.fullName,
          jobTitle: userForm.jobTitle,
          groupId: userForm.groupId || null,
          role: userForm.role,
        };
        await updateUser(selectedUser.id, updates);
        setShowEditModal(false);
        setSelectedUser(null);
      } catch (error) {
        console.error('Error updating user:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Create new user - require password
      setPendingAction('add');
      setShowPasswordModal(true);
    }
  };

  // Handle user deletion
  const handleDeleteUser = (userId) => {
    const user = normalUsers.find(u => u.id === userId);
    if (window.confirm(`Are you sure you want to delete ${user?.fullName}? This action cannot be undone.`)) {
      setPendingAction('delete');
      setPendingDeleteUserId(userId);
      setShowPasswordModal(true);
    }
  };

  // Get user statistics
  const getUserStats = (userId) => {
    const userTasks = getTasksByAssignee(userId);
    const completed = userTasks.filter(t => t.status === 'completed').length;
    const inProgress = userTasks.filter(t => t.status === 'in_progress').length;
    const pending = userTasks.filter(t => t.status === 'pending').length;
    return { total: userTasks.length, completed, inProgress, pending };
  };

  // Get role badge
  const getRoleBadge = (role) => {
    const badges = {
      team_leader: { label: 'Team Leader', className: 'badge-warning' },
      client: { label: 'Member', className: 'badge-info' },
    };
    const badge = badges[role] || badges.client;
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  // Get group name
  const getGroupName = (groupId) => {
    if (!groupId) return 'Unassigned';
    const group = getGroupById(groupId);
    return group?.name || 'Unknown';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">
            User Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage all registered users in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="w-4 h-4" />
          <span>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => openEditModal()}
            className="btn btn-primary whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            className="select w-full sm:w-auto sm:min-w-[140px]"
            >
              <option value="all">All Roles</option>
              <option value="team_leader">Team Leaders</option>
              <option value="client">Members</option>
            </select>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="select w-full sm:w-auto sm:min-w-[160px]"
          >
            <option value="all">All Groups</option>
            <option value="unassigned">Unassigned</option>
            {availableGroups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchQuery || roleFilter !== 'all' || groupFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setGroupFilter('all');
              }}
              className="btn btn-secondary whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Users Table */}
      {!isLoading && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No users found</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {searchQuery || roleFilter !== 'all' || groupFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'No users registered yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const userStats = getUserStats(user.id);
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                              user.role === 'team_leader'
                                ? 'bg-amber-600'
                                : 'bg-brand-600'
                            }`}>
                              {user.fullName.charAt(0)}
                            </div>
                            <div>
                              <button
                                onClick={() => openProfileModal(user)}
                                className="font-medium text-slate-800 hover:text-brand-600 transition-colors text-left"
                              >
                                {user.fullName}
                              </button>
                              {user.jobTitle && (
                                <p className="text-sm text-slate-500">{user.jobTitle}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {getGroupName(user.groupId)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckSquare className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {userStats.total} ({userStats.completed} completed)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openProfileModal(user)}
                              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-brand-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2 text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="User Profile"
        maxWidth="max-w-2xl"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-medium ${
                selectedUser.role === 'team_leader'
                  ? 'bg-amber-600'
                  : 'bg-brand-600'
              }`}>
                {selectedUser.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-slate-800">
                  {selectedUser.fullName}
                </h3>
                {selectedUser.jobTitle && (
                  <p className="text-slate-500 mt-1">{selectedUser.jobTitle}</p>
                )}
                <div className="mt-2">
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Group Assignment
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-800">{getGroupName(selectedUser.groupId)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Member Since
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-800">
                    {format(parseISO(selectedUser.createdAt), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  System Role
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-800 capitalize">
                    {selectedUser.role === 'team_leader' ? 'Team Leader' : 'Team Member'}
                  </span>
                </div>
              </div>
            </div>

            {/* Task Statistics */}
            <div className="pt-6 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Task Statistics</h4>
              {(() => {
                const stats = getUserStats(selectedUser.id);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-600 uppercase tracking-wider">Completed</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-600 uppercase tracking-wider">In Progress</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgress}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.pending}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  openEditModal(selectedUser);
                }}
                className="btn btn-primary flex-1"
              >
                <Edit2 className="w-4 h-4" />
                Edit User
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="btn btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedUser ? 'Edit User' : 'Add New User'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUserSubmit} className="space-y-5">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={userForm.fullName}
              onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              className={`input ${formErrors.fullName ? 'border-red-500' : ''}`}
              placeholder="Enter full name"
            />
            {formErrors.fullName && (
              <p className="text-sm text-red-500 mt-1">{formErrors.fullName}</p>
            )}
          </div>


          <div>
            <label className="label">Job Title / Role</label>
            <input
              type="text"
              value={userForm.jobTitle}
              onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
              className="input"
              placeholder="e.g., Developer, Designer, Analyst..."
            />
          </div>

          <div>
            <label className="label">Group Assignment</label>
            <select
              value={userForm.groupId}
              onChange={(e) => setUserForm({ ...userForm, groupId: e.target.value })}
              className="select"
            >
              <option value="">Unassigned</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">System Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className="select"
            >
              <option value="client">Team Member</option>
              <option value="team_leader">Team Leader</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                <>
                  {selectedUser ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Verification Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setAdminPassword('');
          setPasswordError('');
          setPendingAction(null);
          setPendingDeleteUserId(null);
        }}
        title="Authorization Required"
        maxWidth="max-w-md"
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

