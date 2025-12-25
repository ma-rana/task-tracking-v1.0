import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { logSecurityEvent } from './utils/security';
import { clearCacheForRoute } from './utils/cacheControl';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import GroupManagement from './pages/admin/GroupManagement';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import ClientDashboard from './pages/client/ClientDashboard';
import TasksPage from './pages/client/TasksPage';
import NoGroupsError from './pages/NoGroupsError';
import Forbidden from './pages/Forbidden';
import GroupUnavailable from './pages/GroupUnavailable';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Protected route for Admin Portal - requires admin session
// Enhanced to prevent content flashes by checking permissions before rendering
function AdminProtectedRoute({ children }) {
  const { currentUser, loading, isValidAdminSession } = useAuth();
  
  // Show loading spinner while checking authentication
  // This prevents any content flash
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }
  
  // Validate session before rendering ANY content
  // This ensures no protected content is ever visible to unauthorized users
  if (!currentUser || !isValidAdminSession()) {
    // Log security event
    logSecurityEvent('UNAUTHORIZED_ROUTE_ACCESS', {
      path: window.location.pathname,
      attemptedBy: currentUser?.id || 'anonymous',
    });
    // Redirect to admin login page instead of showing Forbidden
    return <Navigate to="/admin" replace />;
  }
  
  // Only render children if all security checks pass
  return children;
}

// Public route for Client Portal - no authentication required
function PublicRoute({ children }) {
  return children;
}

// Root redirect - always go to dashboard
function RootRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const location = useLocation();

  // Clear cache for sensitive routes on navigation
  useEffect(() => {
    clearCacheForRoute(location.pathname);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
    <Routes>
      {/* Root redirect - always go to dashboard */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Admin login path */}
      <Route path="/admin" element={<AdminLoginPage />} />
      
      {/* Admin Portal Routes - Protected */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
      </Route>
      
      <Route
        path="/admin/users"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<UserManagement />} />
      </Route>
      
      <Route
        path="/admin/groups"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<GroupManagement />} />
      </Route>
      
      <Route
        path="/admin/admins"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminUserManagement />} />
      </Route>
      
      {/* Client Portal Routes - Public (No Authentication Required) */}
      <Route
        path="/dashboard"
        element={
          <PublicRoute>
            <ClientLayout />
          </PublicRoute>
        }
      >
        <Route index element={<ClientDashboard />} />
      </Route>
      
      <Route
        path="/tasks"
        element={
          <PublicRoute>
            <ClientLayout />
          </PublicRoute>
        }
      >
        <Route index element={<TasksPage />} />
      </Route>
      
      {/* Error Pages */}
      <Route path="/error" element={<NoGroupsError />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/group-unavailable" element={<GroupUnavailable />} />
      
      {/* Catch all - redirect to public client portal */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
