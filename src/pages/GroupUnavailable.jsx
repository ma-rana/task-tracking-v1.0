import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupUnavailable() {
  const [errorTimestamp] = useState(new Date());

  useEffect(() => {
    document.title = '403 - Group Unavailable | Task Track';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="card p-8 md:p-12 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-amber-600" aria-hidden="true" />
            </div>
          </div>

          {/* Main Error Message */}
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-800 mb-4">
            403 - Group Unavailable
          </h1>

          {/* Error Description */}
          <div className="space-y-4 mb-8">
            <p className="text-lg text-slate-600">
              This group is currently unavailable as it has been deactivated by the administrator.
            </p>
            <p className="text-slate-500">
              Please contact your administrator if you believe this is a mistake, or check back later 
              once the group has been reactivated.
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
                <span className="text-slate-800 font-medium">Group Deactivated</span>
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
            Error: This group is currently unavailable as it has been deactivated by the administrator.
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

