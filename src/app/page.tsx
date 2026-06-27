import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Users, BookOpen, BarChart3, ExternalLink, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = await getCurrentUserRole();
    redirect(role === 'student' ? '/student' : '/dashboard');
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo size="md" priority />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</Button>
            </Link>
            <Link href="/student/signup">
              <Button variant="secondary" size="sm">Student register</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Staff portal</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-primary-light px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Zap className="h-4 w-4" />
            Integrated with Moodle LMS
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
            Complete Student MIS for
            <br />
            <span className="text-primary">Excellence Online College</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted">
            Manage student records, enrollments, attendance, fees, and academic programs —
            all in one modern platform.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link href="/student/signup">
              <Button size="lg">Register as a student</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">Sign in</Button>
            </Link>
            <a href="https://lms.excellenceonlinecollege.com/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary">
                <ExternalLink className="h-4 w-4" />
                Open Moodle LMS
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Everything you need</h2>
            <p className="mt-3 text-muted">A complete toolkit for managing your institution</p>
          </div>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
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
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary-light p-3 transition-colors group-hover:bg-blue-100">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-primary mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Secure & role-based access</h2>
          <p className="mt-3 max-w-xl mx-auto text-muted">
            Separate portals for students, teachers, staff, and administrators — each with the right level of access.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/student/signup"><Button variant="secondary">Student portal</Button></Link>
            <Link href="/signup"><Button>Staff portal</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © 2026 Excellence Online College · Powered by Supabase & Vercel
      </footer>
    </div>
  );
}
