'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DocumentPdfButtonProps {
  documentId: string;
  filename: string;
  label?: string;
  className?: string;
  showPrintButton?: boolean;
}

export function DocumentPdfButton({ 
  documentId, 
  filename, 
  label = 'Save as PDF', 
  className,
  showPrintButton = true 
}: DocumentPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById(documentId);
    if (!element) {
      alert('Document not found. Please try again.');
      return;
    }

    setIsGenerating(true);

    try {
      await document.fonts.ready;

      // Store original styles
      const originalStyles = {
        width: element.style.width,
        maxWidth: element.style.maxWidth,
        padding: element.style.padding,
        border: element.style.border,
        boxShadow: element.style.boxShadow,
        margin: element.style.margin,
        position: element.style.position,
        left: element.style.left,
        top: element.style.top,
      };

      // Apply print-specific styles to match @media print
      element.style.width = '210mm';
      element.style.maxWidth = '210mm';
      element.style.padding = '15mm';
      element.style.border = 'none';
      element.style.boxShadow = 'none';
      element.style.margin = '0';
      element.style.position = 'relative';
      element.style.left = 'auto';
      element.style.top = 'auto';

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

      // Restore original styles
      element.style.width = originalStyles.width;
      element.style.maxWidth = originalStyles.maxWidth;
      element.style.padding = originalStyles.padding;
      element.style.border = originalStyles.border;
      element.style.boxShadow = originalStyles.boxShadow;
      element.style.margin = originalStyles.margin;
      element.style.position = originalStyles.position;
      element.style.left = originalStyles.left;
      element.style.top = originalStyles.top;

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
      {showPrintButton && (
        <Button onClick={handlePrint} variant="secondary" className={className}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      )}
    </div>
  );
}

// Export as FeePdfButton for backward compatibility
export { DocumentPdfButton as FeePdfButton };
