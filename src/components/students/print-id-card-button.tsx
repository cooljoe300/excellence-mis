'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function PrintIdCardButton() {
  return (
    <Button onClick={() => window.print()} className="w-full">
      <Printer className="h-4 w-4" />
      Print ID Card
    </Button>
  );
}
