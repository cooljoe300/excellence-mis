'use client';

import { PrintDocumentButton } from '@/components/documents/print-document-button';

export function PrintInvoiceButton({ label = 'Save as PDF' }: { label?: string }) {
  return <PrintDocumentButton label={label} className="w-full sm:w-auto" />;
}
