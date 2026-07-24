'use client';

import { PrintDocumentButton } from '@/components/documents/print-document-button';

export function PrintInvoiceButton({ 
  label = 'Save as PDF', 
  className,
  documentTitle 
}: { 
  label?: string; 
  className?: string;
  documentTitle?: string;
}) {
  return <PrintDocumentButton label={label} className={className} documentTitle={documentTitle} />;
}
