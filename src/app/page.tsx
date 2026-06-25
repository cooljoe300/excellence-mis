import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Users, BookOpen, BarChart3, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white font-bold">
              EOC
            </div>
            <div>
              <p className="font-bold text-slate-900">Excellence Online College</p>
              <p className="text-xs text-slate-500">Student Management System</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm text-blue-700 mb-6">
          <GraduationCap className="h-4 w-4" />
          Integrated with Moodle LMS
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          Complete Student MIS for<br />
          <span className="text-blue-700">Excellence Online College</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Manage student records, enrollments, attendance, fees, and academic programs —
          all in one modern platform built on Supabase and deployed on Vercel.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Start managing students</Button>
          </Link>
          <a href="https://lms.excellenceonlinecollege.com/" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="secondary">
              <ExternalLink className="h-4 w-4" />
              Open Moodle LMS
            </Button>
          </a>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">Everything you need</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: 'Student Management',
                desc: 'Register students, track status, link to LMS accounts, and manage personal records.',
              },
              {
                icon: BookOpen,
                title: 'Academic Programs',
                desc: 'Manage programs, courses, enrollments, grades, and attendance in one system.',
              },
              {
                icon: BarChart3,
                title: 'Reports & Fees',
                desc: 'Track tuition payments, generate reports, and monitor institutional KPIs.',
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3">
                  <feature.icon className="h-6 w-6 text-blue-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        © 2026 Excellence Online College · Powered by Supabase & Vercel
      </footer>
    </div>
  );
}
