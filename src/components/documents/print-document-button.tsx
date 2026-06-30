'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export function PrintDocumentButton({
  label = 'Save as PDF',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button type="button" onClick={() => window.print()} className={className}>
      <FileDown className="h-4 w-4" />
      {label}
    </Button>
  );
}
