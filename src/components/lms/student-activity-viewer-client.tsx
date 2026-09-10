'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { getStudentLearningActivitiesByCourse } from '@/app/actions/lms';
import type { Student, LmsLearningActivity } from '@/lib/types';
import { ArrowLeft, Video, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

export function StudentActivityViewerClient({ 
  student, 
  activity 
}: { 
  student: Student; 
  activity: LmsLearningActivity 
}) {
  const [iframeError, setIframeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { error: toastError } = useToast();

  function handleIframeLoad() {
    setLoading(false);
    setIframeError(false);
  }

  function handleIframeError() {
    setLoading(false);
    setIframeError(true);
  }

  function handleContinueToLesson() {
    window.location.href = activity.external_url;
  }

  useEffect(() => {
    // Verify student is enrolled in this course
    async function verifyEnrollment() {
      try {
        const activities = await getStudentLearningActivitiesByCourse(activity.course_id);
        const hasAccess = activities.some(a => a.id === activity.id);
        
        if (!hasAccess) {
          toastError('You do not have access to this learning activity');
          window.location.href = '/student/lms/my-learning';
        }
      } catch (error) {
        console.error('Error verifying enrollment:', error);
      }
    }

    verifyEnrollment();
  }, [activity.course_id, activity.id, toastError]);

  return (
    <div>
      <PageHeader
        title={activity.name}
        description={activity.course?.name || 'Learning Activity'}
        action={
          <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-4">
        <Badge variant="outline">{activity.provider.replace('_', ' ')}</Badge>
        <Badge status={activity.status}>{activity.status}</Badge>
      </div>

      {activity.display_description && activity.description && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700">{activity.description}</p>
        </div>
      )}

      {activity.launch_mode === 'same_tab' ? (
        <div className="text-center py-12">
          <div className="mb-4 flex justify-center">
            <Video className="h-16 w-16 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            This learning activity opens in a new tab
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            Click below to continue to the learning provider.
          </p>
          <Button onClick={handleContinueToLesson} size="lg">
            <ExternalLink className="h-4 w-4 mr-2" />
            Continue to Lesson
          </Button>
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}

          {iframeError ? (
            <div className="border border-slate-200 rounded-lg p-8 text-center">
              <div className="mb-4 flex justify-center">
                <AlertTriangle className="h-16 w-16 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Cannot display inside MIS
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                This learning activity is hosted by an external learning provider.
                The provider does not allow this page to be displayed inside the MIS.
              </p>
              <Button onClick={handleContinueToLesson} size="lg">
                <ExternalLink className="h-4 w-4 mr-2" />
                Continue to Lesson
              </Button>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={activity.external_url}
              className="w-full min-h-[80vh] border-0 rounded-lg"
              title={activity.name}
              allow="camera; microphone; fullscreen; display-capture"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
        </div>
      )}
    </div>
  );
}
