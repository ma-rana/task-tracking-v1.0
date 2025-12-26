import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Shield,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  X,
  Mail,
  User,
  Lock,
  AlertCircle,
  Trash2,
  Star,
  Crown
} from 'lucide-react';
import Modal from '../../components/Modal';
import { format, parseISO } from 'date-fns';

export default function AdminUserManagement() {
  const { users, getAdminUsers, register, updateUser, deleteUser, currentUser, getPrimaryAdmin, setPrimaryAdmin } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form state
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Get admin users
  const adminUsers = getAdminUsers();
  const primaryAdmin = getPrimaryAdmin();

  // Filter admins based on search
  const filteredAdmins = useMemo(() => {
    return adminUsers.filter(admin => {
      const matchesSearch = 
        admin.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [adminUsers, searchQuery]);

  // Open create modal
  const openCreateModal = () => {
    setAdminForm({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setAdminForm({
      fullName: admin.fullName,
      email: admin.email,
      password: '',
      confirmPassword: '',
    });
    setFormErrors({});
    setShowEditModal(true);
  };


  // Validate form
  const validateForm = (isPasswordOnly = false) => {
    const errors = {};
    
    if (!isPasswordOnly) {
      if (!adminForm.fullName.trim()) {
        errors.fullName = 'Full name is required';
      }
      if (!adminForm.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    // Password validation for create modal
    if (showCreateModal) {
      if (!adminForm.password) {
        errors.password = 'Password is required';
      } else if (adminForm.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      
      if (!adminForm.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (adminForm.password !== adminForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    // Password validation for edit modal (only if password is provided)
    if (showEditModal && adminForm.password) {
      if (adminForm.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      
      if (!adminForm.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (adminForm.password !== adminForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle admin creation
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check if email already exists
    const existingUser = users.find(u => u.email === adminForm.email);
    if (existingUser) {
      setFormErrors({ email: 'An account with this email already exists' });
      return;
    }

    const newAdmin = await register({
      fullName: adminForm.fullName.trim(),
      email: adminForm.email.trim().toLowerCase(),
      password: adminForm.password,
      role: 'admin',
      groupId: null,
    }, true); // isAdminUser = true

    if (newAdmin) {
      setShowCreateModal(false);
      setAdminForm({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    }
  };

  // Handle admin update
  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    
    // If password is provided, validate it
    if (adminForm.password) {
      if (!validateForm()) return;
    } else {
      // Otherwise, validate without password
      if (!validateForm(true)) return;
    }

    // Check if email is being changed and already exists
    if (adminForm.email !== selectedAdmin.email) {
      const existingUser = users.find(u => u.email === adminForm.email && u.id !== selectedAdmin.id);
      if (existingUser) {
        setFormErrors({ email: 'An account with this email already exists' });
        return;
      }
    }

    const updates = {
      fullName: adminForm.fullName.trim(),
      email: adminForm.email.trim().toLowerCase(),
    };

    // Only update password if provided
    if (adminForm.password) {
      updates.password = adminForm.password;
    }

    await updateUser(selectedAdmin.id, updates);
    setShowEditModal(false);
    setSelectedAdmin(null);
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">
            Admin User Management
          </h1>
          <p className="text-slate-500 mt-1">
            Create and manage administrator accounts
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          Create Admin
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
          />
        </div>
      </div>

      {/* Admin Users List */}
      <div className="card overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {searchQuery ? 'No admins found' : 'No admin users yet'}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Create your first administrator account to get started'}
            </p>
            {!searchQuery && (
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus className="w-5 h-5" />
                Create Admin
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-medium">
                          {admin.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{admin.fullName}</p>
                            {admin.id === currentUser?.id && (
                              <span className="badge badge-info text-xs">You</span>
                            )}
                            {admin.isPrimary && (
                              <span className="badge badge-warning text-xs flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {admin.isPrimary ? 'Primary Administrator' : 'Administrator'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{admin.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                      {admin.createdAt ? format(parseISO(admin.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!admin.isPrimary && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Set ${admin.fullName} as the primary admin account?`)) {
                                setPrimaryAdmin(admin.id);
                              }
                            }}
                            className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Set as primary admin"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit admin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!admin.isPrimary && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete ${admin.fullName}? This action cannot be undone.`)) {
                                await deleteUser(admin.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete admin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Administrator Account"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={adminForm.fullName}
              onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
              className="input"
              placeholder="Enter full name"
            />
            {formErrors.fullName && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label className="label">Email Address *</label>
            <input
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              className="input"
              placeholder="admin@example.com"
            />
            {formErrors.email && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="label">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="input pr-10"
                placeholder="Enter password (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.password}
              </p>
            )}
          </div>

          <div>
            <label className="label">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={adminForm.confirmPassword}
                onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                className="input pr-10"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Create Admin
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAdmin(null);
          setAdminForm({
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
          });
          setFormErrors({});
        }}
        title="Edit Administrator Account"
      >
        <form onSubmit={handleUpdateAdmin} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={adminForm.fullName}
              onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
              className="input"
              placeholder="Enter full name"
            />
            {formErrors.fullName && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label className="label">Email Address *</label>
            <input
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              className="input"
              placeholder="admin@example.com"
            />
            {formErrors.email && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.email}
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600 mb-3">
              Leave password fields empty to keep current password
            </p>
            <div>
              <label className="label">New Password (optional)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="input pr-10"
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {formErrors.password}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="label">Confirm New Password (optional)</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  className="input pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedAdmin(null);
                setAdminForm({
                  fullName: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                });
                setFormErrors({});
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Update Admin
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

