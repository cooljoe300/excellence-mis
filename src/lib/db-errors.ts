/**
 * Convert a thrown database/curriculum error into a message an administrator
 * can act on. Server actions return this instead of letting the exception
 * escape, which would turn into an opaque 500 in production.
 */
export function describeDatabaseError(error: unknown, context: string): string {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown database error.';

  console.error(`[${context}]`, error);

  if (
    /does not exist|schema cache|Could not find the (table|column|function|relationship)/i.test(
      detail
    )
  ) {
    return `The programme configuration schema is out of date in this environment (${detail}). Apply supabase/migrations/055_programme_enrollment.sql to the database, then reload.`;
  }

  return detail;
}
