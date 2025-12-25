import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log error details for diagnostics
    console.error('[ErrorBoundary] Uncaught error in component tree', error, info);

    // Persist a lightweight error record for later inspection
    try {
      const existing = JSON.parse(localStorage.getItem('tasktrack_ui_errors') || '[]');
      existing.unshift({
        message: error?.message || 'Unknown error',
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('tasktrack_ui_errors', JSON.stringify(existing.slice(0, 50)));
    } catch {
      // Ignore storage issues
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="card max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="mt-4 text-lg font-display font-semibold text-slate-800">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              An unexpected error occurred while loading this page. The issue has been logged.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/dashboard')}
                className="btn btn-secondary"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

