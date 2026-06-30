'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function PrintIdCardButton() {
  function handlePrint() {
    const card = document.getElementById('student-id-card');
    if (!card) {
      window.print();
      return;
    }

    const printRoot = document.createElement('div');
    printRoot.id = 'student-id-card-print-root';
    printRoot.appendChild(card.cloneNode(true));
    document.body.appendChild(printRoot);
    document.body.classList.add('print-id-card');

    const cleanup = () => {
      printRoot.remove();
      document.body.classList.remove('print-id-card');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.setTimeout(cleanup, 2000);
    window.print();
  }

  return (
    <Button onClick={handlePrint} className="w-full">
      <Printer className="h-4 w-4" />
      Print ID Card
    </Button>
  );
}
