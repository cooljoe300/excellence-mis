'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface DocumentPdfButtonProps {
  label?: string;
  className?: string;
  documentTitle?: string;
}

export function DocumentPdfButton({ 
  label = 'Print', 
  className,
  documentTitle 
}: DocumentPdfButtonProps) {
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
    <Button onClick={handlePrint} className={className}>
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}

// Export as FeePdfButton for backward compatibility
export { DocumentPdfButton as FeePdfButton };
