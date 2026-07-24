import { redirect } from 'next/navigation';

export default function SignupPage() {
  // Redirect to student signup - public registration is for students only
  // Staff accounts are created by administrators through the dashboard
  redirect('/student/signup');
}
