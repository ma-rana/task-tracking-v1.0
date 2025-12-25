import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function NoGroupsError() {
  const [errorTimestamp] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { getPublicGroups } = useData();

  // Auto-detect when an admin activates a public group and move users
  // from the error page to the public dashboard without manual reload.
  useEffect(() => {
    const checkForActivatedGroup = () => {
      const publicGroups = getPublicGroups();
      if (publicGroups.length > 0) {
        navigate('/dashboard', { replace: true });
      }
    };

    // Run an immediate check in case the group is already active
    checkForActivatedGroup();

    // Poll periodically while the user is on the error page
    const intervalId = setInterval(checkForActivatedGroup, 10000); // 10s

    return () => clearInterval(intervalId);
  }, [getPublicGroups, navigate]);

  const handleRefresh = () => {
    setIsRefreshing(true);

    const publicGroups = getPublicGroups();

    if (publicGroups.length > 0) {
      // A group has been activated - send user directly to dashboard
      navigate('/dashboard', { replace: true });
    } else {
      // Still no group active - perform a hard reload to re-check state
      window.location.reload();
    }
  };

  // Log error occurrence
  useEffect(() => {
    const errorLog = {
      type: 'NO_GROUPS_ACTIVATED',
      message: 'No public groups are currently activated',
      timestamp: errorTimestamp.toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // Store in localStorage for admin review
    const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
    existingLogs.push(errorLog);
    // Keep only last 50 error logs
    const recentLogs = existingLogs.slice(-50);
    localStorage.setItem('error_logs', JSON.stringify(recentLogs));
    
    // Set HTTP status code (503 Service Unavailable)
    // Note: In a real application, this would be set server-side
    document.title = '503 - Service Unavailable | Task Track';
  }, [errorTimestamp]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="card p-8 md:p-12 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" aria-hidden="true" />
            </div>
          </div>

          {/* Main Error Message */}
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-800 mb-4">
            No Group Activated
          </h1>

          {/* Error Description */}
          <div className="space-y-4 mb-8">
            <p className="text-lg text-slate-600">
              We're sorry, but there are currently no active groups available.
            </p>
            <p className="text-slate-500">
              This means that no groups have been activated by an administrator for public access. 
              Please check back later or contact your administrator for assistance.
            </p>
          </div>

          {/* Error Details Card */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Error Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Error Type:</span>
                <span className="text-slate-800 font-medium">No Groups Activated</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">HTTP Status:</span>
                <span className="text-slate-800 font-medium">503 Service Unavailable</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Occurred At:</span>
                <span className="text-slate-800 font-medium">
                  {format(errorTimestamp, 'PPpp')}
                </span>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Accessibility: Screen reader announcement */}
          <div className="sr-only" role="alert" aria-live="polite">
            Error: No groups are currently activated. Service unavailable.
          </div>
        </div>

        {/* Footer with timestamp */}
        <div className="text-center mt-6 text-sm text-slate-400">
          <p>Error ID: {errorTimestamp.getTime()}</p>
        </div>
      </div>
    </div>
  );
}

