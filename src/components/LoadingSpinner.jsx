import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <Loader2 className={`animate-spin text-brand-600 ${sizeClasses[size]}`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return spinner;
}

