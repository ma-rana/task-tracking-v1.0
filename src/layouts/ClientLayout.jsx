import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  LayoutDashboard, 
  CheckSquare,
  Menu, 
  X,
  Zap,
  ChevronRight,
  Users
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ClientLayout() {
  const { getPublicGroups, getActiveGroup, dataReady, logDeactivatedGroupAccess } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive currently active public group via centralized selector
  const publicGroups = getPublicGroups();
  const activeGroup = getActiveGroup();

  // Check for activated groups and redirect to error page if none
  useEffect(() => {
    // Don't redirect if already on error pages
    if (location.pathname === '/error' || location.pathname === '/group-unavailable') {
      return;
    }

    // Wait until data has hydrated from storage to avoid false redirects
    if (!dataReady) {
      return;
    }

    // Check if no active public group is available
    if (!activeGroup) {
      // Log attempted access to an unavailable/deactivated group
      logDeactivatedGroupAccess(null, {
        path: location.pathname,
        message: 'Client attempted to access dashboard/tasks with no active public group',
      });
      // Redirect to the dedicated "no groups" error page
      navigate('/error', { replace: true });
    }
  }, [activeGroup, navigate, location.pathname, dataReady, logDeactivatedGroupAccess]);

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks & Users' },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-lg">Task Track</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Info */}
        {activeGroup && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{activeGroup.name}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-3 py-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="hidden lg:block">
            <h1 className="text-lg font-display font-semibold text-slate-800">
              {activeGroup ? `${activeGroup.name} Workspace` : 'Task Management Workspace'}
            </h1>
          </div>

          <div className="w-10 h-10" /> {/* Spacer for alignment */}
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
