import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkRateLimit, resetRateLimit, generateCSRFToken, getCSRFToken, validateSessionIntegrity, logSecurityEvent } from '../utils/security';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// User types
const USER_TYPES = {
  ADMIN: 'admin',
  TEAM_LEADER: 'team_leader',
  CLIENT: 'client',
};

// Initial demo users with clear separation
const initialUsers = [
  // Admin users - can ONLY login via /admin
  {
    id: 'admin-1',
    fullName: 'Alex Morgan',
    email: 'admin@tasktrack.com',
    password: 'admin123',
    role: USER_TYPES.ADMIN,
    groupId: null,
    jobTitle: 'System Administrator',
    createdAt: new Date().toISOString(),
    isAdminUser: true, // Flag to identify admin users
    isPrimary: true, // Primary admin account - cannot be deleted
  },
  // Normal users - can ONLY login via /login
  {
    id: 'tl-1',
    fullName: 'Sarah Johnson',
    email: 'sarah@tasktrack.com',
    password: 'leader123',
    role: USER_TYPES.TEAM_LEADER,
    groupId: 'group-1',
    jobTitle: 'Team Leader',
    createdAt: new Date().toISOString(),
    isAdminUser: false,
  },
  {
    id: 'user-1',
    fullName: 'Mike Chen',
    email: 'mike@tasktrack.com',
    password: 'user123',
    role: USER_TYPES.CLIENT,
    groupId: 'group-1',
    jobTitle: 'Developer',
    createdAt: new Date().toISOString(),
    isAdminUser: false,
  },
  {
    id: 'user-2',
    fullName: 'Emily Davis',
    email: 'emily@tasktrack.com',
    password: 'user123',
    role: USER_TYPES.CLIENT,
    groupId: 'group-1',
    jobTitle: 'Designer',
    createdAt: new Date().toISOString(),
    isAdminUser: false,
  },
  {
    id: 'tl-2',
    fullName: 'James Wilson',
    email: 'james@tasktrack.com',
    password: 'leader123',
    role: USER_TYPES.TEAM_LEADER,
    groupId: 'group-2',
    jobTitle: 'Team Leader',
    createdAt: new Date().toISOString(),
    isAdminUser: false,
  },
  {
    id: 'user-3',
    fullName: 'Lisa Anderson',
    email: 'lisa@tasktrack.com',
    password: 'user123',
    role: USER_TYPES.CLIENT,
    groupId: 'group-2',
    jobTitle: 'Analyst',
    createdAt: new Date().toISOString(),
    isAdminUser: false,
  },
];

// Security logging
const logAuthEvent = (event, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
    // Never log passwords
    password: undefined,
  };
  
  // Store auth logs
  try {
    const existingLogs = JSON.parse(localStorage.getItem('tasktrack_auth_logs') || '[]');
    existingLogs.unshift(logEntry);
    // Keep only last 100 entries
    localStorage.setItem('tasktrack_auth_logs', JSON.stringify(existingLogs.slice(0, 100)));
  } catch (e) {
    // Ignore storage errors
  }
  
  // Log to console only in development (errors are always logged)
  if (process.env.NODE_ENV === 'development') {
  console.log(`[AUTH] ${event}:`, { ...details, password: '***' });
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Toast helper - stores message to be displayed
  const showToast = useCallback((message, type = 'info') => {
    setToastMessage({ message, type, id: Date.now() });
  }, []);

  // Clear toast
  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Generate a simple session token
  const generateSessionToken = useCallback((userId, userType) => {
    const token = `${userType}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return token;
  }, []);

  // Validate session with enhanced security
  const validateSession = useCallback((token, expectedUserType) => {
    if (!token) return false;
    
    // Use enhanced session integrity validation
    return validateSessionIntegrity(token, expectedUserType);
  }, []);

  // Ensure admin accounts have proper names
  const ensureAdminNames = useCallback((userList) => {
    return userList.map(user => {
      if (user.isAdminUser && (!user.fullName || user.fullName.trim() === '')) {
        // Generate default admin name from email or use default
        const defaultName = user.email 
          ? user.email.split('@')[0].split('.').map(part => 
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ')
          : 'Administrator';
        return { ...user, fullName: defaultName };
      }
      return user;
    });
  }, []);

  // Ensure at least one primary admin exists
  const ensurePrimaryAdmin = useCallback((userList) => {
    const adminUsers = userList.filter(u => u.isAdminUser);
    const hasPrimary = adminUsers.some(u => u.isPrimary);
    
    if (!hasPrimary && adminUsers.length > 0) {
      // Set the first admin as primary if none exists
      const firstAdmin = adminUsers[0];
      return userList.map(user => ({
        ...user,
        isPrimary: user.id === firstAdmin.id ? true : (user.isAdminUser ? false : user.isPrimary)
      }));
    }
    
    return userList;
  }, []);

  // Load users and session from localStorage
  useEffect(() => {
    const storedUsers = localStorage.getItem('tasktrack_users');
    const storedSession = localStorage.getItem('tasktrack_session');
    
    let allUsers;
    if (storedUsers) {
      allUsers = JSON.parse(storedUsers);
      // Ensure admin names are set
      allUsers = ensureAdminNames(allUsers);
      // Ensure at least one primary admin exists
      allUsers = ensurePrimaryAdmin(allUsers);
      setUsers(allUsers);
    } else {
      allUsers = ensureAdminNames(initialUsers);
      allUsers = ensurePrimaryAdmin(allUsers);
      setUsers(allUsers);
      localStorage.setItem('tasktrack_users', JSON.stringify(allUsers));
    }
    
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        const user = allUsers.find(u => u.id === session.userId);
        
        // Validate session token matches user type
        if (user && session.token) {
          const expectedType = user.isAdminUser ? 'admin' : 'client';
          if (validateSession(session.token, expectedType)) {
            setCurrentUser(user);
            setSessionToken(session.token);
            logAuthEvent('SESSION_RESTORED', { userId: user.id, email: user.email });
          } else {
            // Invalid session, clear it
            localStorage.removeItem('tasktrack_session');
            logAuthEvent('SESSION_INVALID', { userId: session.userId });
          }
        }
      } catch (e) {
        localStorage.removeItem('tasktrack_session');
        logAuthEvent('SESSION_PARSE_ERROR', { error: 'Failed to parse session' });
      }
    }
    
    setLoading(false);
  }, [validateSession, ensureAdminNames]);

  // Sync users to localStorage
  useEffect(() => {
    if (users.length > 0) {
      // Ensure at least one primary admin exists before saving
      const withPrimary = ensurePrimaryAdmin(users);
      if (JSON.stringify(withPrimary) !== JSON.stringify(users)) {
        setUsers(withPrimary);
      }
      localStorage.setItem('tasktrack_users', JSON.stringify(withPrimary));
    }
  }, [users, ensurePrimaryAdmin]);

  // Admin login handler - ONLY accepts admin users
  const loginAdmin = async (email, password) => {
    // Rate limiting check
    const rateLimitCheck = checkRateLimit(`admin_login_${email}`, 5, 15 * 60 * 1000);
    if (!rateLimitCheck.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { email, portal: 'admin' });
      showToast(rateLimitCheck.message, 'error');
      return false;
    }
    
    // Find user by email
    const user = users.find(u => u.email === email);
    
    // Log attempt (without password)
    logAuthEvent('ADMIN_LOGIN_ATTEMPT', { email, portal: 'admin' });
    
    // Check if user exists and password matches
    if (!user || user.password !== password) {
      logAuthEvent('LOGIN_FAILED', { email, reason: 'Invalid credentials', portal: 'admin' });
      logSecurityEvent('AUTHENTICATION_FAILED', { email, portal: 'admin' });
      showToast('Invalid credentials', 'error');
      return false;
    }
    
    // SECURITY: Reject non-admin users attempting admin login
    if (!user.isAdminUser) {
      // Log the security event but show generic error
      logAuthEvent('SECURITY_VIOLATION', { 
        email, 
        reason: 'Non-admin user attempted admin portal access',
        portal: 'admin'
      });
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { email, portal: 'admin', userRole: user.role });
      showToast('Invalid credentials', 'error');
      return false;
    }
    
    // Generate CSRF token
    const csrfToken = generateCSRFToken();
    
    // Generate admin session token with enhanced security
    const token = generateSessionToken(user.id, 'admin');
    setSessionToken(token);
    setCurrentUser(user);
    localStorage.setItem('tasktrack_session', JSON.stringify({ 
      userId: user.id, 
      token,
      csrfToken,
      createdAt: Date.now()
    }));
    
    // Reset rate limit on successful login
    resetRateLimit(`admin_login_${email}`);
    
    logAuthEvent('ADMIN_LOGIN_SUCCESS', { userId: user.id, email });
    logSecurityEvent('AUTHENTICATION_SUCCESS', { userId: user.id, email, portal: 'admin' });
    showToast(`Welcome back, ${user.fullName}!`, 'success');
    return true;
  };

  // Normal user login handler - ONLY accepts non-admin users
  const loginUser = async (email, password) => {
    // Rate limiting check
    const rateLimitCheck = checkRateLimit(`user_login_${email}`, 5, 15 * 60 * 1000);
    if (!rateLimitCheck.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { email, portal: 'user' });
      showToast(rateLimitCheck.message, 'error');
      return false;
    }
    
    // Find user by email
    const user = users.find(u => u.email === email);
    
    // Log attempt
    logAuthEvent('USER_LOGIN_ATTEMPT', { email, portal: 'user' });
    
    // Check if user exists and password matches
    if (!user || user.password !== password) {
      logAuthEvent('LOGIN_FAILED', { email, reason: 'Invalid credentials', portal: 'user' });
      logSecurityEvent('AUTHENTICATION_FAILED', { email, portal: 'user' });
      showToast('Invalid credentials', 'error');
      return false;
    }
    
    // SECURITY: Reject admin users attempting normal login
    // Show generic error to not reveal admin portal exists
    if (user.isAdminUser) {
      logAuthEvent('SECURITY_VIOLATION', { 
        email, 
        reason: 'Admin user attempted normal portal access',
        portal: 'user'
      });
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { email, portal: 'user', userRole: user.role });
      // Generic message - DO NOT reveal admin portal exists
      showToast('Invalid credentials', 'error');
      return false;
    }
    
    // Generate CSRF token
    const csrfToken = generateCSRFToken();
    
    // Generate client session token with enhanced security
    const token = generateSessionToken(user.id, 'client');
    setSessionToken(token);
    setCurrentUser(user);
    localStorage.setItem('tasktrack_session', JSON.stringify({ 
      userId: user.id, 
      token,
      csrfToken,
      createdAt: Date.now()
    }));
    
    // Reset rate limit on successful login
    resetRateLimit(`user_login_${email}`);
    
    logAuthEvent('USER_LOGIN_SUCCESS', { userId: user.id, email });
    logSecurityEvent('AUTHENTICATION_SUCCESS', { userId: user.id, email, portal: 'user' });
    showToast(`Welcome back, ${user.fullName}!`, 'success');
    return true;
  };

  const logout = () => {
    logAuthEvent('LOGOUT', { userId: currentUser?.id, email: currentUser?.email });
    setCurrentUser(null);
    setSessionToken(null);
    localStorage.removeItem('tasktrack_session');
    showToast('You have been logged out', 'info');
  };

  const register = async (userData, isAdminUser = false) => {
    try {
      // For admin users, email is required
      if (isAdminUser && !userData.email) {
        showToast('Email is required for admin users', 'error');
        return false;
      }

      // Generate a default password if not provided (for public users without email)
      const password = userData.password || `temp_${Math.random().toString(36).slice(2, 10)}`;

      // Prepare the request body
      const requestBody = {
        fullName: userData.fullName,
        email: userData.email || null,
        password: password,
        role: userData.role || (isAdminUser ? 'admin' : 'client'),
        groupId: userData.groupId || null,
        jobTitle: userData.jobTitle || null,
        isAdminUser: isAdminUser,
      };

      // Make API call to create user
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create user', 'error');
        return false;
      }

      const newUser = await response.json();
      
      // Update local state
      setUsers(prev => [...prev, newUser]);
      logAuthEvent('USER_REGISTERED', { userId: newUser.id, email: newUser.email || 'N/A', isAdminUser });
      showToast('User registered successfully', 'success');
      return newUser;
    } catch (error) {
      console.error('Register error:', error);
      showToast('Failed to create user. Please try again.', 'error');
      return false;
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      // Prevent changing isAdminUser flag
      const safeUpdates = { ...updates };
      delete safeUpdates.isAdminUser;
      
      // Ensure admin accounts always have a name
      const user = users.find(u => u.id === userId);
      if (user?.isAdminUser && safeUpdates.fullName && safeUpdates.fullName.trim() === '') {
        // Don't allow empty names for admin accounts
        showToast('Admin accounts must have a name', 'error');
        return;
      }
      
      // Check if user is being removed from group (groupId set to null when it wasn't null before)
      const isRemovingFromGroup = safeUpdates.groupId === null && user?.groupId !== null && user?.groupId !== undefined;
      
      // Hash password if it's being updated
      if (safeUpdates.password) {
        // Password will be hashed on the server, just send it as-is
      }

      // Make API call to update user
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(safeUpdates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update user', 'error');
        return;
      }

      const updatedUserData = await response.json();
      
      // Update local state
      setUsers(prev => {
        const updated = prev.map(u => 
          u.id === userId ? updatedUserData : u
        );
        // Ensure all admin names are set
        return ensureAdminNames(updated);
      });
      
      if (currentUser?.id === userId) {
        const updatedUser = { ...currentUser, ...updatedUserData };
        // Ensure admin name is set
        if (updatedUser.isAdminUser && (!updatedUser.fullName || updatedUser.fullName.trim() === '')) {
          updatedUser.fullName = updatedUser.email 
            ? updatedUser.email.split('@')[0].split('.').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1)
              ).join(' ')
            : 'Administrator';
        }
        setCurrentUser(updatedUser);
      }
      
      logAuthEvent('USER_UPDATED', { userId, updates: Object.keys(safeUpdates) });
      
      // Show appropriate message based on action
      if (isRemovingFromGroup) {
        showToast('User removed from team successfully', 'success');
      } else {
        showToast('User updated successfully', 'success');
      }
    } catch (error) {
      console.error('Update user error:', error);
      showToast('Failed to update user. Please try again.', 'error');
    }
  };

  const deleteUser = async (userId) => {
    try {
      if (userId === currentUser?.id) {
        showToast('You cannot delete yourself', 'error');
        return false;
      }
      
      const userToDelete = users.find(u => u.id === userId);
      if (userToDelete?.isAdminUser) {
        // Check if it's a primary admin
        if (userToDelete?.isPrimary) {
          showToast('Cannot delete primary admin account', 'error');
          return false;
        }
        // Allow deletion of secondary admin accounts
      }
      
      // Make API call to delete user
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete user', 'error');
        return false;
      }
      
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      logAuthEvent('USER_DELETED', { userId });
      showToast('User deleted successfully', 'success');
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      showToast('Failed to delete user. Please try again.', 'error');
      return false;
    }
  };

  // Set admin as primary (and unset others)
  const setPrimaryAdmin = (userId) => {
    const adminToSet = users.find(u => u.id === userId);
    if (!adminToSet || !adminToSet.isAdminUser) {
      showToast('Only admin users can be set as primary', 'error');
      return false;
    }

    setUsers(prev => prev.map(u => ({
      ...u,
      isPrimary: u.id === userId ? true : (u.isAdminUser ? false : u.isPrimary)
    })));
    
    logAuthEvent('PRIMARY_ADMIN_SET', { userId });
    showToast('Primary admin account updated', 'success');
    return true;
  };

  // Get primary admin
  const getPrimaryAdmin = () => {
    return users.find(u => u.isAdminUser && u.isPrimary);
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
  };

  const getUsersByGroup = (groupId) => {
    return users.filter(u => u.groupId === groupId && !u.isAdminUser);
  };

  const getUsersByRole = (role) => {
    return users.filter(u => u.role === role);
  };

  // Get only non-admin users (for normal portal views)
  const getNormalUsers = () => {
    return users.filter(u => !u.isAdminUser);
  };

  // Get only admin users
  const getAdminUsers = () => {
    return users.filter(u => u.isAdminUser);
  };

  const isAdmin = currentUser?.role === USER_TYPES.ADMIN && currentUser?.isAdminUser;
  const isTeamLeader = currentUser?.role === USER_TYPES.TEAM_LEADER;
  const isClient = currentUser?.role === USER_TYPES.CLIENT;

  // Check if current session is valid for admin portal
  const isValidAdminSession = useCallback(() => {
    return currentUser?.isAdminUser && validateSession(sessionToken, 'admin');
  }, [currentUser, sessionToken, validateSession]);

  // Check if current session is valid for client portal
  const isValidClientSession = useCallback(() => {
    return currentUser && !currentUser.isAdminUser && validateSession(sessionToken, 'client');
  }, [currentUser, sessionToken, validateSession]);

  const value = {
    currentUser,
    users,
    loading,
    loginAdmin,
    loginUser,
    logout,
    register,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByGroup,
    getUsersByRole,
    getNormalUsers,
    getAdminUsers,
    getPrimaryAdmin,
    setPrimaryAdmin,
    isAdmin,
    isTeamLeader,
    isClient,
    isValidAdminSession,
    isValidClientSession,
    USER_TYPES,
    toastMessage,
    clearToast,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
