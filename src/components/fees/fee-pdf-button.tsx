'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FeePdfButtonProps {
  documentId: string;
  filename: string;
  label?: string;
  className?: string;
}

export function FeePdfButton({ documentId, filename, label = 'Save as PDF', className }: FeePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    const element = document.getElementById(documentId);
    if (!element) {
      alert('Document not found. Please try again.');
      return;
    }

    setIsGenerating(true);

    try {
      await document.fonts.ready;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          return element.classList?.contains('no-print');
        },
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlElement = el as HTMLElement;
            const computedStyle = window.getComputedStyle(el);
            
            const color = computedStyle.color;
            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
              htmlElement.style.color = color;
            }
            
            const backgroundColor = computedStyle.backgroundColor;
            if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
              htmlElement.style.backgroundColor = backgroundColor;
            }
            
            if (el.tagName === 'IMG') {
              (el as HTMLImageElement).crossOrigin = 'anonymous';
            }
          });
          
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              color: #0f172a !important;
              background-color: #ffffff !important;
              border-color: #e2e8f0 !important;
            }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-900 { background-color: #0f172a !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-700 { color: #334155 !important; }
            .border-slate-200 { border-color: #e2e8f0 !important; }
            .border-slate-300 { border-color: #cbd5e1 !important; }
            .border-slate-900 { border-color: #0f172a !important; }
            .text-blue-600 { color: #2563eb !important; }
            .text-emerald-600 { color: #059669 !important; }
            .text-emerald-700 { color: #047857 !important; }
            .text-red-700 { color: #b91c1c !important; }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleDownloadPDF} disabled={isGenerating} className={className}>
        <Download className="h-4 w-4 mr-2" />
        {isGenerating ? 'Generating...' : label}
      </Button>
      <Button onClick={handlePrint} variant="secondary" className={className}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
    </div>
  );
}
