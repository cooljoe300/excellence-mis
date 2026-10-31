/**
 * Intake assignment for student registration.
 *
 * Registration flows that do not ask for an intake (self-registration, and
 * staff registering without picking one) assign the current active intake so
 * students are grouped correctly on the Students list.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveCurrentIntakeId(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('intakes')
    .select('id')
    .eq('is_active', true)
    .order('is_current', { ascending: false })
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('resolveCurrentIntakeId: failed to load intakes:', error.message);
    return null;
  }

  return data?.id ?? null;
}
