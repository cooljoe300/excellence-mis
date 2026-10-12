import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export function OnlineClassesLocked() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-light mx-auto mb-4">
        <Lock className="h-7 w-7 text-accent" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Online Classes Locked</h1>
      <p className="text-slate-600 mt-2">
        You need to make a payment before you can access online classes.
      </p>
      <Link href="/student/fees">
        <Button className="mt-6">Make a Payment</Button>
      </Link>
    </div>
  );
}
