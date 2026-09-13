'use client';

import { useState } from 'react';
import { MonitorPlay, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentLMSPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    // Force iframe reload by changing the key
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Open LMS</h1>
          <p className="text-slate-600">Access your Moodle Learning Management System</p>
        </div>
      </div>

      {hasError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
          <MonitorPlay className="h-16 w-16 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to load LMS</h2>
          <p className="text-slate-600 mb-6 max-w-md">
            The Learning Management System could not be loaded at the moment. Please try again.
          </p>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="relative w-full rounded-lg border border-slate-200 bg-white" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                <p className="text-sm text-slate-600">Loading LMS...</p>
              </div>
            </div>
          )}
          <iframe
            src="https://lms.excellenceonlinecollege.com"
            className="h-full w-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            title="Moodle LMS"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
