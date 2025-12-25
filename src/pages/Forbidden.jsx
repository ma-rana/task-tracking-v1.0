import { useEffect, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { logSecurityEvent } from '../utils/security';

export default function Forbidden() {
  const [errorTimestamp] = useState(new Date());

  useEffect(() => {
    // Log forbidden access attempt
    logSecurityEvent('FORBIDDEN_ACCESS', {
      path: window.location.pathname,
      referrer: document.referrer,
    });

    // Set HTTP status code (403 Forbidden)
    document.title = '403 - Forbidden | Task Track';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="card p-8 md:p-12 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-red-600" aria-hidden="true" />
            </div>
          </div>

          {/* Main Error Message */}
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-800 mb-4">
            403 Forbidden
          </h1>

          {/* Error Description */}
          <div className="space-y-4 mb-8">
            <p className="text-lg text-slate-600">
              You do not have permission to access this resource.
            </p>
            <p className="text-slate-500">
              This page requires administrator privileges. If you believe this is an error, 
              please contact your system administrator.
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
                <span className="text-slate-800 font-medium">Forbidden Access</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">HTTP Status:</span>
                <span className="text-slate-800 font-medium">403 Forbidden</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Occurred At:</span>
                <span className="text-slate-800 font-medium">
                  {format(errorTimestamp, 'PPpp')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Path:</span>
                <span className="text-slate-800 font-medium break-all">
                  {window.location.pathname}
                </span>
              </div>
            </div>
          </div>

          {/* Accessibility: Screen reader announcement */}
          <div className="sr-only" role="alert" aria-live="polite">
            Error: Access forbidden. You do not have permission to access this resource.
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

