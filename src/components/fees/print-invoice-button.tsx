'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function PrintInvoiceButton() {
  return (
    <Button onClick={() => window.print()} className="w-full sm:w-auto">
      <Download className="h-4 w-4" />
      Download / Print Invoice
    </Button>
  );
}
