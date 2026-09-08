'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ReportsRefreshButton() {
  const router = useRouter();
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => router.refresh()}>
      <RefreshCw className="h-4 w-4" />
      Retry
    </Button>
  );
}
