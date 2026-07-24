'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export function PrintDocumentButton({
  label = 'Save as PDF',
  className,
  documentTitle,
}: {
  label?: string;
  className?: string;
  documentTitle?: string;
}) {
  const handlePrint = () => {
    const originalTitle = document.title;
    
    if (documentTitle) {
      document.title = documentTitle;
    }
    
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  return (
    <Button type="button" onClick={handlePrint} className={className}>
      <FileDown className="h-4 w-4" />
      {label}
    </Button>
  );
}
