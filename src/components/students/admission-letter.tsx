'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Printer, FileText, Mail, MessageCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/lib/types';
import jsPDF from 'jspdf';
import { AdmissionStamp } from './admission-stamp';

interface AdmissionLetterProps {
  student: Student;
}

export function AdmissionLetter({ student }: AdmissionLetterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const admissionNumber = student.admission_number || student.student_number;
  const program = student.program as { name: string; code: string; description: string; duration_months: number; department?: string } | null;
  const intake = student.intake as { name: string; code: string } | null;

  // Institution details
  const institution = {
    name: 'EXCELLENCE ONLINE COLLEGE',
    tagline: 'Excellence Through Quality Education',
    address: 'Main Campus',
    city: 'Nairobi',
    country: 'Kenya',
    phone: '+254 711 552570',
    email: 'info@excellencecollege.ac.ke',
    website: 'www.excellencecollege.ac.ke',
  };

  const department = program?.department || 'Business & ICT';
  const campus = institution.address;
  const modeOfStudy = 'Online';
  const academicYear = '2026/2027';

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // Load and add logo to PDF
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          reader.onloadend = () => resolve();
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        const logoDataUrl = reader.result as string;
        
        // Add logo at top center
        const logoWidth = 20;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoDataUrl, 'PNG', logoX, y, logoWidth, logoHeight);
        y += logoHeight + 5;
      } catch (logoError) {
        console.warn('Could not load logo for PDF:', logoError);
        // Continue without logo if it fails
      }

      // Header text
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(institution.name, pageWidth / 2, y, { align: 'center' });
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(institution.tagline, pageWidth / 2, y, { align: 'center' });
      y += 3;

      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(
        `${institution.address} | ${institution.city}, ${institution.country} | Tel: ${institution.phone} | Email: ${institution.email}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      y += 8;

      // Horizontal line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Letter Title
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('ADMISSION LETTER', pageWidth / 2, y, { align: 'center' });
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${formatDate(student.enrollment_date) || new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Recipient Info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('To:', margin, y);
      y += 3;
      doc.text(`${student.first_name} ${student.last_name}`, margin, y);
      y += 3;
      doc.setFont('helvetica', 'normal');
      doc.text(`Admission Number: ${admissionNumber}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`RE: ADMISSION TO ${program?.name?.toUpperCase()}`, margin, y);
      y += 8;

      // Salutation
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dear ${student.first_name} ${student.last_name},`, margin, y);
      y += 5;

      // Body
      const bodyText = [
        `We are pleased to inform you that you have been admitted to Excellence Online College to pursue ${program?.name}, ${program?.code}.`,
        '',
        'Your admission details are as follows:',
      ];

      doc.setFontSize(8);
      bodyText.forEach(line => {
        doc.text(line, margin, y);
        y += 3;
      });
      y += 3;

      // Student Details Table
      const tableData = [
        ['Student Name', `${student.first_name} ${student.last_name}`],
        ['Admission Number', admissionNumber],
        ['Programme', program?.name || ''],
        ['Programme Code', program?.code || ''],
        ['Mode of Study', modeOfStudy],
        ['Intake', intake?.name || ''],
        ['Academic Year', academicYear],
        ['Programme Duration', program?.duration_months ? `${program.duration_months} months` : 'As per programme structure'],
      ];

      doc.setFontSize(7);
      let tableY = y;
      const rowHeight = 5;
      const col1Width = 45;
      const col2Width = pageWidth - margin * 2 - col1Width;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, tableY, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Field', margin + 2, tableY + 3.5);
      doc.text('Details', margin + col1Width + 2, tableY + 3.5);
      tableY += rowHeight;

      // Table rows
      doc.setFont('helvetica', 'normal');
      tableData.forEach((row, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, tableY, pageWidth - margin * 2, rowHeight, 'F');
        }
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(margin, tableY, pageWidth - margin * 2, rowHeight);
        doc.text(row[0], margin + 2, tableY + 3.5);
        doc.text(row[1], margin + col1Width + 2, tableY + 3.5);
        tableY += rowHeight;
      });

      y = tableY + 5;

      // Online Learning Statement
      const onlineLearningText = [
        'Online Learning Information:',
        '',
        'As an online student, you will access your learning resources, course materials,',
        'assignments, assessments, announcements, and other academic services through',
        'the Excellence Online College Student Portal/Learning Management System (LMS).',
        '',
        'You are required to log in to your student portal using the credentials provided',
        'to you and ensure that your student profile is complete. All important academic',
        'communication, including course registration, learning activities, examinations,',
        'and other institutional updates, will be communicated through the appropriate',
        'online platforms.',
        '',
        'You are encouraged to familiarize yourself with the Student Portal and LMS and',
        'participate actively in all online learning activities. Where applicable, virtual',
        'orientation sessions and other online student support services will be',
        'communicated through the official college channels.',
      ];

      doc.setFontSize(7);
      onlineLearningText.forEach(line => {
        doc.text(line, margin, y);
        y += 3;
      });
      y += 3;

      // Closing
      const closingText = [
        'We welcome you to Excellence Online College and look forward to supporting',
        'you throughout your academic journey. We wish you success in your studies.',
      ];

      doc.setFontSize(8);
      closingText.forEach(line => {
        doc.text(line, margin, y);
        y += 3;
      });
      y += 5;

      doc.text('Yours faithfully,', margin, y);
      y += 10;

      // Signature section
      const signatureY = y;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      
      // Admissions Officer signature
      doc.line(margin, signatureY, margin + 50, signatureY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Admissions Officer / Registrar', margin, signatureY + 4);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('EXCELLENCE ONLINE COLLEGE', margin, signatureY + 8);

      // Add stamp image to the right of signature
      try {
        const stampResponse = await fetch('/eoc.png');
        const stampBlob = await stampResponse.blob();
        const stampReader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          stampReader.onloadend = () => resolve();
          stampReader.onerror = reject;
          stampReader.readAsDataURL(stampBlob);
        });
        
        const stampDataUrl = stampReader.result as string;
        
        // Add stamp image
        const stampWidth = 25;
        const stampHeight = 25;
        const stampX = margin + 60;
        const stampY = signatureY - 10;
        doc.addImage(stampDataUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);

        // Add dynamic date overlay on top of stamp
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        const stampDate = `${day} ${month} ${year}`;

        doc.setFontSize(6);
        doc.setTextColor(220, 38, 38); // Red color
        doc.setFont('helvetica', 'bold');
        doc.text(stampDate, stampX + stampWidth / 2, stampY + stampHeight / 2 + 2, { align: 'center' });
      } catch (stampError) {
        console.warn('Could not load stamp for PDF:', stampError);
        // Continue without stamp if it fails
      }

      // Footer
      y = pageHeight - 15;
      doc.setFontSize(6);
      doc.setTextColor(100);
      doc.text('This is an official admission letter. For verification, contact the Admissions Office.', pageWidth / 2, y, { align: 'center' });
      y += 3;
      doc.text('Excellence Online College | A Premier Institution of Higher Learning', pageWidth / 2, y, { align: 'center' });

      // Save PDF
      doc.save(`Admission_Letter_${admissionNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      // Generate PDF first
      generatePDF();
      
      // Create mailto link with pre-filled subject
      const subject = encodeURIComponent(`Admission Letter - ${admissionNumber}`);
      const body = encodeURIComponent(
        `Dear ${student.first_name} ${student.last_name},\n\n` +
        `Congratulations on your admission to Excellence Online College!\n\n` +
        `Your admission number is: ${admissionNumber}\n` +
        `Programme: ${program?.name}\n\n` +
        `Please find your admission letter attached.\n\n` +
        `Best regards,\n` +
        `Admissions Office\n` +
        `Excellence Online College`
      );
      
      window.location.href = `mailto:${student.email}?subject=${subject}&body=${body}`;
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    try {
      // Generate PDF first
      generatePDF();
      
      const message = encodeURIComponent(
        `Dear ${student.first_name} ${student.last_name},\n\n` +
        `Congratulations on your admission to Excellence Online College!\n\n` +
        `🎓 Admission Number: ${admissionNumber}\n` +
        `📚 Programme: ${program?.name}\n` +
        `📅 Intake: ${intake?.name}\n\n` +
        `Your admission letter has been generated. Please check your email or contact the admissions office.\n\n` +
        `Excellence Online College\n` +
        `📞 ${institution.phone}`
      );
      
      const phone = student.phone?.replace(/\D/g, ''); // Remove non-digits
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      } else {
        alert('Student phone number not available. Please add phone number to send via WhatsApp.');
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Failed to send WhatsApp message. Please try again.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-4 no-print">
      <div className="flex flex-wrap gap-3 no-print">
        <Button onClick={generatePDF} disabled={isGenerating}>
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </Button>
        <Button onClick={handlePrint} variant="secondary">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleSendEmail} variant="secondary" disabled={isSendingEmail}>
          <Mail className="h-4 w-4 mr-2" />
          {isSendingEmail ? 'Opening...' : 'Send Email'}
        </Button>
        <Button onClick={handleSendWhatsApp} variant="secondary" disabled={isSendingWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          {isSendingWhatsApp ? 'Opening...' : 'Send WhatsApp'}
        </Button>
      </div>

      {/* Print-friendly admission letter */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-0">
          <div id="admission-letter" className="max-w-[210mm] mx-auto bg-white p-[15mm] border-2 border-slate-900" style={{ minHeight: '297mm' }}>
            {/* Header with Logo */}
            <div className="text-center mb-4 border-b-2 border-slate-900 pb-3">
              <div className="flex justify-center mb-2">
                <Image
                  src="/logo.png"
                  alt="Excellence Online College Logo"
                  width={60}
                  height={60}
                  className="h-14 w-14 object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                {institution.name}
              </h1>
              <p className="text-xs text-slate-600 mb-1">
                {institution.tagline}
              </p>
              <p className="text-[10px] text-slate-500">
                {institution.address} | {institution.city}, {institution.country} | Tel: {institution.phone} | Email: {institution.email}
              </p>
            </div>

            {/* Letter Title */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 underline">
                ADMISSION LETTER
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Date: {formatDate(student.enrollment_date) || new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Recipient Info */}
            <div className="mb-4 text-xs text-slate-700">
              <p className="font-semibold">To:</p>
              <p className="font-semibold">{student.first_name} {student.last_name}</p>
              <p>Admission Number: {admissionNumber}</p>
              <p className="mt-1 font-semibold">RE: ADMISSION TO {program?.name?.toUpperCase()}</p>
            </div>

            {/* Salutation */}
            <div className="mb-3">
              <p className="text-xs text-slate-700">
                Dear <span className="font-semibold">{student.first_name} {student.last_name}</span>,
              </p>
            </div>

            {/* Body */}
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed mb-4">
              <p>
                We are pleased to inform you that you have been admitted to 
                <span className="font-semibold"> Excellence Online College</span> to pursue 
                <span className="font-semibold"> {program?.name}</span>, <span className="font-semibold">{program?.code}</span>.
              </p>

              <p>
                Your admission details are as follows:
              </p>

              {/* Student Details Table */}
              <div className="my-3 border border-slate-300">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50 w-1/3">Student Name</td>
                      <td className="py-1 px-3">{student.first_name} {student.last_name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Admission Number</td>
                      <td className="py-1 px-3">{admissionNumber}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Programme</td>
                      <td className="py-1 px-3">{program?.name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Programme Code</td>
                      <td className="py-1 px-3">{program?.code}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Mode of Study</td>
                      <td className="py-1 px-3">{modeOfStudy}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Intake</td>
                      <td className="py-1 px-3">{intake?.name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Academic Year</td>
                      <td className="py-1 px-3">{academicYear}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3 font-semibold bg-slate-50">Programme Duration</td>
                      <td className="py-1 px-3">{program?.duration_months ? `${program.duration_months} months` : 'As per programme structure'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Online Learning Statement */}
              <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded">
                <p className="font-semibold mb-2 text-xs">Online Learning Information:</p>
                <p className="mb-2 text-xs">
                  As an online student, you will access your learning resources, course materials, assignments, assessments, announcements, and other academic services through the Excellence Online College Student Portal/Learning Management System (LMS).
                </p>
                <p className="mb-2 text-xs">
                  You are required to log in to your student portal using the credentials provided to you and ensure that your student profile is complete. All important academic communication, including course registration, learning activities, examinations, and other institutional updates, will be communicated through the appropriate online platforms.
                </p>
                <p className="text-xs">
                  You are encouraged to familiarize yourself with the Student Portal and LMS and participate actively in all online learning activities. Where applicable, virtual orientation sessions and other online student support services will be communicated through the official college channels.
                </p>
              </div>

              {/* Closing */}
              <p className="font-semibold text-xs">
                We welcome you to Excellence Online College and look forward to supporting you throughout your academic journey. We wish you success in your studies.
              </p>
            </div>

            {/* Closing */}
            <div className="mb-4">
              <p className="text-xs text-slate-700">
                Yours faithfully,
              </p>
            </div>

            {/* Signature Section */}
            <div className="flex items-start gap-6">
              <div className="max-w-[200px]">
                <div className="border-t border-slate-900 pt-1">
                  <p className="text-xs font-semibold text-slate-900">Admissions Officer / Registrar</p>
                  <p className="text-[10px] text-slate-600">EXCELLENCE ONLINE COLLEGE</p>
                </div>
              </div>
              <div className="mt-1">
                <AdmissionStamp />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-slate-300 text-center">
              <p className="text-[10px] text-slate-500">
                This is an official admission letter. For verification, contact the Admissions Office.
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Excellence Online College | A Premier Institution of Higher Learning
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #admission-letter,
          #admission-letter * {
            visibility: visible;
          }
          
          #admission-letter {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            margin: 0;
            padding: 15mm;
            border: none !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
