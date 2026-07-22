'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Printer, FileText, Mail, MessageCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Student } from '@/lib/types';
import printJS from 'print-js';
import { AdmissionStamp } from './admission-stamp';

interface AdmissionLetterProps {
  student: Student;
  enrollments?: any[];
}

export function AdmissionLetter({ student, enrollments: initialEnrollments = [] }: AdmissionLetterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>(initialEnrollments);
  const letterRef = useRef<HTMLDivElement>(null);

  const admissionNumber = student.admission_number || student.student_number;
  const program = student.program as { name: string; code: string; description: string; duration_months: number; department?: string; tuition_fee: number } | null;
  const intake = student.intake as { name: string; code: string } | null;

  // Update enrollments when prop changes
  useEffect(() => {
    setEnrollments(initialEnrollments);
  }, [initialEnrollments]);

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

  // Calculate total units and fees
  const unitNames = enrollments
    .map((enrollment) => enrollment.course?.name)
    .filter(Boolean)
    .join(', ');
  const tuitionFee = program?.tuition_fee || 0;
  const unitFees = enrollments.reduce((sum, enrollment) => {
    return sum + (enrollment.course?.unit_fee || 0);
  }, 0);
  const totalFees = tuitionFee + unitFees;

  const handleDownloadPDF = async () => {
    if (!letterRef.current) {
      alert('Admission letter element not found. Please try again.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Starting PDF generation...');
      
      // Use print-js to generate PDF
      printJS({
        printable: 'admission-letter',
        type: 'html',
        style: `
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          #admission-letter {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            margin: 0;
            background: white !important;
          }
          #admission-letter * {
            color: #000000 !important;
            background-color: #ffffff !important;
          }
        `,
        targetStyles: ['*'],
        documentTitle: `Admission_Letter_${admissionNumber}`,
      });
      
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
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
        <Button onClick={handleDownloadPDF} disabled={isGenerating}>
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
          <div ref={letterRef} id="admission-letter" className="max-w-[210mm] mx-auto bg-white p-[15mm] border-2 border-slate-900 print:border-none" style={{ minHeight: '297mm' }}>
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
            <div className="text-xs text-slate-700 leading-relaxed mb-3">
              <p className="text-justify mb-2">
                We are pleased to inform you that you have been admitted to 
                <span className="font-semibold"> Excellence Online College</span> to pursue 
                <span className="font-semibold"> {program?.name}</span>, <span className="font-semibold">{program?.code}</span>.
              </p>

              <p className="text-justify mb-2">
                Your admission details are as follows:
              </p>

              {/* Student Details Table */}
              <div className="my-2 border border-slate-300">
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
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Programme Duration</td>
                      <td className="py-1 px-3">{program?.duration_months ? `${program.duration_months} months` : 'As per programme structure'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-3 font-semibold bg-slate-50">Units Registered</td>
                      <td className="py-1 px-3 text-xs">{unitNames || 'None'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3 font-semibold bg-slate-50">Total Fees</td>
                      <td className="py-1 px-3">{formatCurrency(totalFees)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Online Learning Statement */}
            <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded">
              <p className="font-semibold mb-1 text-xs">Online Learning Information:</p>
              <p className="mb-1 text-xs text-justify leading-relaxed">
                As an online student, you will access your learning resources, course materials, assignments, assessments, announcements, and other academic services through the Excellence Online College Student Portal/Learning Management System (LMS).
              </p>
              <p className="mb-1 text-xs text-justify leading-relaxed">
                You are required to log in to your student portal using the credentials provided to you and ensure that your student profile is complete. All important academic communication, including course registration, learning activities, examinations, and other institutional updates, will be communicated through the appropriate online platforms.
              </p>
              <p className="text-xs text-justify leading-relaxed">
                You are encouraged to familiarize yourself with the Student Portal and LMS and participate actively in all online learning activities. Where applicable, virtual orientation sessions and other online student support services will be communicated through the official college channels.
              </p>
            </div>

            {/* Closing */}
            <div className="mb-3">
              <p className="font-semibold text-xs text-justify leading-relaxed">
                We welcome you to Excellence Online College and look forward to supporting you throughout your academic journey. We wish you success in your studies.
              </p>
            </div>

            {/* Signature Section */}
            <div className="mb-4">
              <p className="text-xs text-slate-700 mb-3">
                Yours faithfully,
              </p>
              
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="border-t border-slate-900 pt-1">
                    <p className="text-xs font-semibold text-slate-900">Admissions Officer / Registrar</p>
                    <p className="text-[10px] text-slate-600">EXCELLENCE ONLINE COLLEGE</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <AdmissionStamp />
                </div>
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
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          #admission-letter,
          #admission-letter * {
            visibility: visible;
          }
          
          #admission-letter {
            position: relative;
            left: auto;
            top: auto;
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 15mm;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            overflow: visible;
          }
          
          /* Ensure paragraphs don't overlap */
          #admission-letter p {
            display: block;
            margin-bottom: 0.5rem;
            line-height: 1.5;
            page-break-inside: avoid;
          }
          
          /* Ensure online learning section has proper spacing */
          #admission-letter .bg-slate-50 {
            page-break-inside: avoid;
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
          
          /* Ensure stamp renders correctly */
          #admission-letter img {
            max-width: 100%;
            height: auto;
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
