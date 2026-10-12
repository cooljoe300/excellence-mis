import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, AlertCircle, Clock, Lock } from 'lucide-react';

interface LMSAccessProps {
  lmsSynced: boolean;
  lmsUsername: string | null;
  onlineClassesLocked?: boolean;
}

export function LMSAccess({ lmsSynced, lmsUsername, onlineClassesLocked = false }: LMSAccessProps) {
  const lmsUrl = 'https://lms.excellenceonlinecollege.com/';

  if (onlineClassesLocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" />
            Learning Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="flex items-center gap-2 mb-2 font-semibold text-slate-900">
                <Lock className="h-5 w-5 text-accent" />
                Online Classes Locked
              </h4>
              <p className="text-sm text-slate-600">
                You need to make a payment before you can access online classes.
              </p>
            </div>
            <a href="/student/fees">
              <Button size="sm" variant="primary">
                Make a Payment
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-blue-700" />
          Learning Portal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {lmsSynced ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-600" />
              )}
              <h4 className="font-semibold text-slate-900">
                {lmsSynced ? 'LMS Account Active' : 'LMS Account Pending'}
              </h4>
            </div>
            <p className="text-sm text-slate-600">
              {lmsSynced 
                ? `Your account is ready. Username: ${lmsUsername}`
                : 'Your LMS account is being created by administration.'}
            </p>
          </div>
          <a
            href={lmsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" disabled={!lmsSynced}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Access Moodle
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}