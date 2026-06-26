import { Suspense } from 'react';
import { LoginForm, LoginHero } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <LoginHero />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center p-8 bg-slate-50 text-sm text-slate-500">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
