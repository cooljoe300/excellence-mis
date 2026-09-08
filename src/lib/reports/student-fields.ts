import type { Student } from '@/lib/types';
import { getAdmissionNumber } from '@/lib/utils';

type ProfileContact = { email?: string | null; phone?: string | null };

export function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'N/A';
}

export function studentDisplayName(student: Student | null | undefined) {
  if (!student) return 'N/A';
  const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim();
  return displayValue(name);
}

export function studentEmail(student: Student | null | undefined, profile?: ProfileContact | null) {
  return displayValue(student?.email || profile?.email);
}

export function studentPhone(student: Student | null | undefined, profile?: ProfileContact | null) {
  return displayValue(student?.phone || profile?.phone);
}

export function programName(student: Student | null | undefined) {
  return displayValue(student?.program?.name);
}

export function intakeName(student: Student | null | undefined) {
  return displayValue(student?.intake?.name);
}

export function admissionNo(student: Student | null | undefined) {
  if (!student) return 'N/A';
  return displayValue(getAdmissionNumber(student));
}

export function registrationNo(student: Student | null | undefined) {
  return displayValue(student?.student_number);
}

export function digitsForTel(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

export function whatsappHref(phone: string) {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) cleaned = `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('254')) return `https://wa.me/${cleaned}`;
  return `https://wa.me/${cleaned}`;
}

export const STUDENT_LIST_HEADERS = [
  '#',
  'Student',
  'Admission No.',
  'Reg. No.',
  'Programme',
  'Intake',
  'Phone',
  'Email',
  'Status',
];

export function studentListRow(student: Student, index: number): string[] {
  return [
    String(index + 1),
    studentDisplayName(student),
    admissionNo(student),
    registrationNo(student),
    programName(student),
    intakeName(student),
    studentPhone(student),
    studentEmail(student),
    displayValue(student.status),
  ];
}
