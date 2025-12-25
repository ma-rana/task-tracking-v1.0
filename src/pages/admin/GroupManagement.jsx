import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  Plus, 
  Trash2, 
  FolderKanban,
  Search,
  X,
  Edit2,
  Globe,
  Lock,
  Users,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import Modal from '../../components/Modal';

export default function GroupManagement() {
  const { getNormalUsers, updateUser } = useAuth();
  const { groups, createGroup, updateGroup, deleteGroup, toggleGroupVisibility, getActiveGroup } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all', 'public', 'private'
  
  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Form states
  const [groupForm, setGroupForm] = useState({ name: '', description: '', leaderId: '' });
  const [formErrors, setFormErrors] = useState({});

  // Get only normal users (not admin users)
  const normalUsers = getNormalUsers();

  // Currently active (public) group
  const activeGroup = getActiveGroup();

  // Filter data based on search and visibility
  const filteredGroups = groups.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesVisibility = 
      visibilityFilter === 'all' ||
      (visibilityFilter === 'public' && g.isPublic === true) ||
      (visibilityFilter === 'private' && g.isPublic === false);
    
    return matchesSearch && matchesVisibility;
  });

  // Get available team leaders (normal users who can be assigned)
  const getAvailableLeaders = (currentGroupId = null) => {
    return normalUsers.filter(u => 
      !u.groupId || u.groupId === currentGroupId || !groups.find(g => g.leaderId === u.id)
    );
  };

  // Group form handlers
  const openGroupModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        description: group.description || '',
        leaderId: group.leaderId || '',
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', leaderId: '' });
    }
    setFormErrors({});
    setShowGroupModal(true);
  };

  const validateGroupForm = () => {
    const errors = {};
    if (!groupForm.name.trim()) errors.name = 'Group name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGroupSubmit = (e) => {
    e.preventDefault();
    if (!validateGroupForm()) return;

    if (editingGroup) {
      updateGroup(editingGroup.id, {
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        leaderId: groupForm.leaderId || null,
      });
      // Update user's groupId and role when assigning a leader
      if (groupForm.leaderId && groupForm.leaderId !== editingGroup.leaderId) {
        updateUser(groupForm.leaderId, { groupId: editingGroup.id, role: 'team_leader' });
      }
    } else {
      const newGroup = createGroup({
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        leaderId: groupForm.leaderId || null,
        isPublic: false, // Default to private
      });
      // Update user's groupId and role when assigning a leader
      if (newGroup && groupForm.leaderId) {
        updateUser(groupForm.leaderId, { groupId: newGroup.id, role: 'team_leader' });
      }
    }
    setShowGroupModal(false);
  };

  const handleDeleteGroup = (groupId) => {
    if (window.confirm('Are you sure you want to delete this group? Users will be unassigned.')) {
      // Unassign all users from this group before deleting
      normalUsers.filter(u => u.groupId === groupId).forEach(u => {
        updateUser(u.id, { groupId: null });
      });
      deleteGroup(groupId);
    }
  };

  const handleToggleVisibility = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const action = group.isPublic ? 'deactivate' : 'activate';
      if (window.confirm(`Are you sure you want to ${action} this group?`)) {
        toggleGroupVisibility(groupId, !group.isPublic);
      }
    }
  };

  const getGroupName = (groupId) => {
    if (!groupId) return 'Unassigned';
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Unknown';
  };

  const getUserName = (userId) => {
    const user = normalUsers.find(u => u.id === userId);
    return user?.fullName || 'None';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-800">
              Group Management
            </h1>
            <p className="text-slate-500 mt-1">
              Manage groups and their visibility settings
            </p>
          </div>
        </div>

        {/* Active Group Summary */}
        <div className="card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
              activeGroup ? 'bg-emerald-600' : 'bg-slate-400'
            }`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Group
              </p>
              <p className="text-sm font-medium text-slate-800">
                {activeGroup ? activeGroup.name : 'No group is currently active'}
              </p>
            </div>
          </div>
          {activeGroup && (
            <span className="badge badge-success text-xs px-3 py-1">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="select w-full sm:w-auto min-w-[150px]"
          >
            <option value="all">All Groups</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>

          <button
            onClick={() => openGroupModal()}
            className="btn btn-primary w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add Group
          </button>
        </div>
      </div>

      {/* Groups List */}
      <div className="grid gap-4">
        {filteredGroups.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">No groups found</h3>
            <p className="text-slate-400 mt-1">Create your first group to get started</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const groupMembers = normalUsers.filter(u => u.groupId === group.id);
            const leader = normalUsers.find(u => u.id === group.leaderId);
            
            return (
              <div key={group.id} className="card p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      <FolderKanban className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-800">{group.name}</h3>
                        {/* Visibility Badge */}
                        <span className={`badge flex items-center gap-1 ${
                          group.isPublic 
                            ? 'badge-success' 
                            : 'badge-neutral'
                        }`}>
                          {group.isPublic ? (
                            <>
                              <Globe className="w-3 h-3" />
                              Active Group
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Inactive
                            </>
                          )}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-sm text-slate-500 mt-1">{group.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Shield className="w-4 h-4 text-amber-500" />
                          <span>Leader: <span className="font-medium">{leader?.fullName || 'None assigned'}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="w-4 h-4 text-brand-500" />
                          <span>{groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(group.id)}
                      className={`btn ${
                        group.isPublic 
                          ? 'btn-secondary' 
                          : 'btn-primary'
                      }`}
                      title={group.isPublic ? 'Deactivate group' : 'Activate group'}
                    >
                      {group.isPublic ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openGroupModal(group)}
                      className="btn btn-secondary"
                      title="Edit Group"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Group Modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={editingGroup ? 'Edit Group' : 'Create New Group'}
      >
        <form onSubmit={handleGroupSubmit} className="space-y-5">
          <div>
            <label className="label">Group Name *</label>
            <input
              type="text"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              className={`input ${formErrors.name ? 'border-red-500' : ''}`}
              placeholder="Enter group name"
            />
            {formErrors.name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Enter group description (optional)"
            />
          </div>

          <div>
            <label className="label">Team Leader</label>
            <select
              value={groupForm.leaderId}
              onChange={(e) => setGroupForm({ ...groupForm, leaderId: e.target.value })}
              className="select"
            >
              <option value="">No Leader</option>
              {getAvailableLeaders(editingGroup?.id).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} {user.jobTitle ? `(${user.jobTitle})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowGroupModal(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {editingGroup ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

