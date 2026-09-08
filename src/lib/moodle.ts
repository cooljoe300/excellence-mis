interface MoodleUser {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  idnumber: string;
  auth?: string;
}

interface MoodleCreateResult {
  id: number;
  username: string;
}

export function generateLmsUsername(admissionNumber: string): string {
  return admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function createMoodleUser(user: MoodleUser): Promise<MoodleCreateResult> {
  const baseUrl = process.env.MOODLE_URL;
  const token = process.env.MOODLE_WS_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      'Moodle is not configured. Set MOODLE_URL and MOODLE_WS_TOKEN in environment variables.'
    );
  }

  const url = new URL('/webservice/rest/server.php', baseUrl);
  const body = new URLSearchParams({
    wstoken: token,
    wsfunction: 'core_user_create_users',
    moodlewsrestformat: 'json',
    'users[0][username]': user.username,
    'users[0][password]': user.password,
    'users[0][firstname]': user.firstname,
    'users[0][lastname]': user.lastname,
    'users[0][email]': user.email,
    'users[0][idnumber]': user.idnumber,
    'users[0][auth]': user.auth ?? 'manual',
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json();

  if (data?.exception || data?.errorcode) {
    throw new Error(data.message ?? data.debuginfo ?? 'Moodle API error');
  }

  if (Array.isArray(data) && data[0]?.id) {
    return { id: data[0].id, username: user.username };
  }

  throw new Error('Unexpected response from Moodle');
}
