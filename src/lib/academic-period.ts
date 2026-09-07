export type AcademicTermRef = {
  id?: string;
  name?: string | null;
  code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type IntakeAcademicSource = {
  id?: string;
  name?: string | null;
  academic_year?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  term_id?: string | null;
  term?: AcademicTermRef | null;
};

const ACADEMIC_YEAR_PATTERN = /^(\d{4})\s*\/\s*(\d{4})$/;

export function academicYearFromDate(dateValue: string | null | undefined): string {
  if (!dateValue) return '';
  const trimmed = String(dateValue).trim();
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    return `${year}/${year + 1}`;
  }
  const year = Number.parseInt(trimmed.slice(0, 4), 10);
  if (Number.isNaN(year) || year < 1990 || year > 2200) return '';
  return `${year}/${year + 1}`;
}

export function normalizeAcademicYear(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  const match = trimmed.match(ACADEMIC_YEAR_PATTERN);
  if (match) return `${match[1]}/${match[2]}`;
  return trimmed;
}

export function resolveAcademicPeriod(input: {
  intake?: IntakeAcademicSource | null;
  term?: AcademicTermRef | null;
  existingAcademicYear?: string | null;
}): string {
  const intake = input.intake;
  const term = input.term || intake?.term || null;
  const candidates = [
    intake?.academic_year,
    term?.code && ACADEMIC_YEAR_PATTERN.test(term.code) ? term.code : null,
    academicYearFromDate(term?.start_date),
    academicYearFromDate(intake?.start_date),
    input.existingAcademicYear,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAcademicYear(candidate);
    if (normalized) return normalized;
  }

  return '';
}

export function intakeAcademicPeriodLabel(intake?: IntakeAcademicSource | null, existingAcademicYear?: string | null): string {
  return resolveAcademicPeriod({ intake, existingAcademicYear });
}
