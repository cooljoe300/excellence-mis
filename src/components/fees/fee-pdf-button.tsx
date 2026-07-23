'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface DocumentPdfButtonProps {
  label?: string;
  className?: string;
}

export function DocumentPdfButton({ 
  label = 'Print', 
  className 
}: DocumentPdfButtonProps) {
  const handlePrint = () => {
    window.print();
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
