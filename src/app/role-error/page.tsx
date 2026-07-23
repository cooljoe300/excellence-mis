import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RoleErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Role Not Determined</h1>
        </div>
        
        <div className="space-y-4 text-center">
          <p className="text-slate-600">
            Your account role could not be determined. This may happen if:
          </p>
          <ul className="list-inside list-disc space-y-2 text-left text-sm text-slate-600">
            <li>Your account was recently deleted or deactivated</li>
            <li>Your profile has an invalid role assignment</li>
            <li>Your account requires administrator approval</li>
          </ul>
          <p className="text-sm text-slate-600">
            Please contact the system administrator to resolve this issue.
          </p>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login">
            <Button variant="secondary">Back to Login</Button>
          </Link>
          <Link href="/logout">
            <Button>Sign Out</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
