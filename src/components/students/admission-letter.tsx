'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Printer, FileText, Mail, MessageCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Student } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
      
      // Capture the admission letter element as a canvas
      const canvas = await html2canvas(letterRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Ensure images are loaded
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            img.crossOrigin = 'anonymous';
          });
          
          // Convert any lab/lch colors to hex for PDF compatibility
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlElement = el as HTMLElement;
            const computedStyle = window.getComputedStyle(el);
            const color = computedStyle.color;
            const backgroundColor = computedStyle.backgroundColor;
            
            // Replace with PDF-compatible colors if needed
            if (color && (color.includes('lab') || color.includes('lch'))) {
              htmlElement.style.setProperty('color', '#0f172a', 'important');
            }
            if (backgroundColor && (backgroundColor.includes('lab') || backgroundColor.includes('lch'))) {
              htmlElement.style.setProperty('background-color', '#ffffff', 'important');
            }
          });
        },
      });

      console.log('Canvas generated successfully:', canvas.width, 'x', canvas.height);

      // Create PDF with A4 dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate dimensions to fit A4 while maintaining aspect ratio
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log('PDF dimensions:', imgWidth, 'x', imgHeight);

      // Add the canvas image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Save with meaningful filename
      const filename = `Excellence_Online_College_Admission_Letter_${admissionNumber}.pdf`;
      pdf.save(filename);
      
      console.log('PDF saved successfully:', filename);
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
          <div ref={letterRef} id="admission-letter" className="max-w-[210mm] mx-auto bg-white p-[15mm] border-2 border-slate-900 print:border-none">
            {/* Header with Logo */}
            <div className="text-center mb-3 border-b-2 border-slate-900 pb-2">
              <div className="flex justify-center mb-1">
                <Image
                  src="/logo.png"
                  alt="Excellence Online College Logo"
                  width={50}
                  height={50}
                  className="h-12 w-12 object-contain"
                  priority
                />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                {institution.name}
              </h1>
              <p className="text-[10px] text-slate-600 mb-1">
                {institution.tagline}
              </p>
              <p className="text-[9px] text-slate-500">
                {institution.address} | {institution.city}, {institution.country} | Tel: {institution.phone} | Email: {institution.email}
              </p>
            </div>

            {/* Letter Title */}
            <div className="text-center mb-3">
              <h2 className="text-lg font-bold text-slate-900 underline">
                ADMISSION LETTER
              </h2>
              <p className="text-[10px] text-slate-600 mt-1">
                Date: {formatDate(student.enrollment_date) || new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Recipient Info */}
            <div className="mb-3 text-[10px] text-slate-700">
              <p className="font-semibold">To:</p>
              <p className="font-semibold">{student.first_name} {student.last_name}</p>
              <p>Admission Number: {admissionNumber}</p>
              <p className="mt-1 font-semibold">RE: ADMISSION TO {program?.name?.toUpperCase()}</p>
            </div>

            {/* Salutation */}
            <div className="mb-2">
              <p className="text-[10px] text-slate-700">
                Dear <span className="font-semibold">{student.first_name} {student.last_name}</span>,
              </p>
            </div>

            {/* Body */}
            <div className="text-[10px] text-slate-700 leading-relaxed mb-2">
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
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50 w-1/3">Student Name</td>
                      <td className="py-1 px-2">{student.first_name} {student.last_name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Admission Number</td>
                      <td className="py-1 px-2">{admissionNumber}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Programme</td>
                      <td className="py-1 px-2">{program?.name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Programme Code</td>
                      <td className="py-1 px-2">{program?.code}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Mode of Study</td>
                      <td className="py-1 px-2">{modeOfStudy}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Intake</td>
                      <td className="py-1 px-2">{intake?.name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Academic Year</td>
                      <td className="py-1 px-2">{academicYear}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Programme Duration</td>
                      <td className="py-1 px-2">{program?.duration_months ? `${program.duration_months} months` : 'As per programme structure'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-2 font-semibold bg-slate-50">Units Registered</td>
                      <td className="py-1 px-2 text-[10px]">{unitNames || 'None'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-semibold bg-slate-50">Total Fees</td>
                      <td className="py-1 px-2">{formatCurrency(totalFees)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Online Learning Statement */}
            <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded">
              <p className="font-semibold mb-1 text-[10px]">Online Learning Information:</p>
              <p className="mb-1 text-[10px] text-justify leading-relaxed">
                As an online student, you will access learning resources, course materials, assignments, assessments, and academic communication through the <span className="font-semibold">Excellence Online College Student Portal and LMS</span>.
              </p>
              <p className="mb-1 text-[10px] text-justify leading-relaxed">
                Please <span className="font-semibold">create and complete your student account</span> using the registration details provided by <span className="font-semibold">Excellence Online College</span>. You are also required to create an account on the <span className="font-semibold">Excellence Online College LMS</span> at <a href="https://lms.excellenceonlinecollege.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://lms.excellenceonlinecollege.com/</a>.
              </p>
              <p className="text-[10px] text-justify leading-relaxed">
                All important academic updates, course registration, examinations, and learning activities will be communicated through the official online platforms. You are encouraged to familiarize yourself with the Student Portal and LMS and actively participate in all online learning activities.
              </p>
            </div>

            {/* Closing */}
            <div className="mb-2">
              <p className="font-semibold text-[10px] text-justify leading-relaxed">
                We welcome you to Excellence Online College and look forward to supporting you throughout your academic journey. We wish you success in your studies.
              </p>
            </div>

            {/* Signature Section */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-700 mb-2">
                Yours faithfully,
              </p>
              
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="border-t border-slate-900 pt-1">
                    <p className="text-[10px] font-semibold text-slate-900">Admissions Officer / Registrar</p>
                    <p className="text-[9px] text-slate-600">EXCELLENCE ONLINE COLLEGE</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <AdmissionStamp />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-slate-300 text-center">
              <p className="text-[9px] text-slate-500">
                This is an official admission letter. For verification, contact the Admissions Office.
              </p>
              <p className="text-[9px] text-slate-500 mt-1">
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
          
          body > * {
            display: none !important;
          }
          
          #admission-letter {
            display: block !important;
            position: relative;
            left: auto;
            top: auto;
            width: 210mm;
            margin: 0;
            padding: 15mm;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            overflow: visible;
          }
          
          /* Ensure paragraphs don't overlap */
          #admission-letter p {
            display: block !important;
            margin-bottom: 0.5rem;
            line-height: 1.5;
            page-break-inside: avoid;
          }
          
          /* Ensure online learning section has proper spacing */
          #admission-letter .bg-slate-50 {
            page-break-inside: avoid;
          }
          
          /* Ensure stamp renders correctly */
          #admission-letter img {
            max-width: 100%;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
